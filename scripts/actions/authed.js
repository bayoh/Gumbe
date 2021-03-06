import {arrayOf, normalize} from 'normalizr';
import SC from 'soundcloud';
import Cookies from 'js-cookie';
import {navigateTo} from '../actions/navigator';
import {fetchSongs, receiveSongs} from '../actions/playlists';
import * as types from '../constants/ActionTypes';
import {CLIENT_ID} from '../constants/Config';
import {AUTHED_PLAYLIST_SUFFIX} from '../constants/PlaylistConstants';
import {playlistSchema, songSchema, userSchema} from '../constants/Schemas';

const COOKIE_PATH = 'accessToken';

function appendLike(songId) {
    return {
        type: types.APPEND_LIKE,
        songId
    };
}

function authUser(accessToken, shouldShowStream = true) {
    return dispatch => {
        dispatch(fetchAuthedUser(accessToken, shouldShowStream));
    };
}

function fetchAuthedUser(accessToken, shouldShowStream) {
    return dispatch => {
        return fetch(`//api.soundcloud.com/me?oauth_token=${accessToken}`)
            .then(response => response.json())
            .then(json => dispatch(receiveAuthedUserPre(accessToken, json, shouldShowStream)))
            .catch(error => {throw error});
    };
}

function fetchFollowings(accessToken) {
    return dispatch => {
        return fetch(`//api.soundcloud.com/me/followings?oauth_token=${accessToken}`)
            .then(response => response.json())
            .then(json => normalize(json, arrayOf(userSchema)))
            .then(normalized => {
                const users = normalized.result.reduce((obj, userId) => Object.assign({}, obj, {[userId]: 1}), {});
                dispatch(receiveAuthedFollowings(users, normalized.entities));
            })
            .catch(error => {throw error});
  }
}

function fetchLikes(accessToken) {
    return dispatch => {
        return fetch(`//api.soundcloud.com/me/favorites?oauth_token=${accessToken}`)
            .then(response => response.json())
            .then(json => {
                const songs = json.filter(song => song.streamable);
                const normalized = normalize(songs, arrayOf(songSchema));
                const likes = normalized.result.reduce((obj, songId) => Object.assign({}, obj, {[songId]: 1}), {});
                dispatch(receiveLikes(likes));
                dispatch(receiveSongs(normalized.entities, normalized.result, 'likes' + AUTHED_PLAYLIST_SUFFIX, null));
            })
            .catch(error => {throw error});
    };
}

function fetchPlaylists(accessToken) {
    return dispatch => {
        return fetch(`//api.soundcloud.com/me/playlists?oauth_token=${accessToken}`)
            .then(response => response.json())
            .then(json => {
                const normalized = normalize(json, arrayOf(playlistSchema));
                dispatch(receiveAuthedPlaylists(normalized.result, normalized.entities));
                normalized.result.forEach(playlistId => {
                    const playlist = normalized.entities.playlists[playlistId];
                    dispatch(receiveSongs({}, playlist.tracks, playlist.title + AUTHED_PLAYLIST_SUFFIX, null));
                });
            })
            .catch(error => { throw error; });
    };
}

function fetchStream(accessToken) {
    return dispatch => {
        dispatch(fetchSongs(`//api.soundcloud.com/me/activities/tracks/affiliated?limit=50&oauth_token=${accessToken}`, 'stream' + AUTHED_PLAYLIST_SUFFIX));
    };
}

export function initAuth() {
    return dispatch => {
        const accessToken = Cookies.get(COOKIE_PATH);
        if (accessToken) {
            return dispatch(authUser(accessToken, false));
        }
        return null;
    }
}

export function loginUser(shouldShowStream = true) {
    return dispatch => {
        SC.initialize({
            client_id: CLIENT_ID,
            redirect_uri: `${window.location.protocol}//${window.location.host}/api/callback`
        });

        SC.connect().then(authObj => {
            Cookies.set(COOKIE_PATH, authObj.oauth_token);
            dispatch(authUser(authObj.oauth_token, shouldShowStream));
        })
        .catch(error => {
            throw error;
        });
    };
}

export function logoutUser() {
    return (dispatch, getState) => {
        Cookies.remove(COOKIE_PATH);
        const {authed, entities, navigator} = getState();
        const {path} = navigator.route;
        const playlists = authed.playlists.map((playlistId) => {
            return entities.playlists[playlistId].title + AUTHED_PLAYLIST_SUFFIX;
        });

        if (path[0] === 'me') {
            dispatch(navigateTo({path: ['songs']}));
        }

        return dispatch(resetAuthed(playlists));
    }
}

function receiveAccessToken(accessToken) {
    return {
        type: types.RECEIVE_ACCESS_TOKEN,
        accessToken
    };
}

function receiveAuthedUserPre(accessToken, user, shouldShowStream) {
    return dispatch => {
        dispatch(receiveAccessToken(accessToken));
        dispatch(receiveAuthedUser(user));
        dispatch(fetchLikes(accessToken));
        dispatch(fetchPlaylists(accessToken));
        dispatch(fetchStream(accessToken));
        dispatch(fetchFollowings(accessToken));
        if (shouldShowStream) {
            dispatch(navigateTo({path: ['me', 'stream']}));
        }
    };
}

function receiveAuthedFollowings(users, entities) {
    return {
        type: types.RECEIVE_AUTHED_FOLLOWINGS,
        entities,
        users
    };
}

function receiveAuthedPlaylists(playlists, entities) {
    return {
        type: types.RECEIVE_AUTHED_PLAYLISTS,
        entities,
        playlists
    };
}

function receiveAuthedUser(user) {
    return {
        type: types.RECEIVE_AUTHED_USER,
        user
    };
}

function receiveLikes(likes) {
    return {
        type: types.RECEIVE_LIKES,
        likes
    };
}

function resetAuthed(playlists) {
    return {
        type: types.RESET_AUTHED,
        playlists: playlists
    };
}

function setFollowing(userId, following) {
    return {
        type: types.SET_FOLLOWING,
        following,
        userId
    };
}

function setLike(songId, liked) {
    return {
        type: types.SET_LIKE,
        liked,
        songId
    };
}

function syncFollowing(accessToken, userId, following) {
    fetch(`//api.soundcloud.com/me/followings/${userId}?oauth_token=${accessToken}`, {method: following ? 'put' : 'delete'});
}

function syncLike(accessToken, songId, liked) {
    fetch(`//api.soundcloud.com/me/favorites/${songId}?oauth_token=${accessToken}`, {method: liked ? 'put' : 'delete'});
}

export function toggleFollow(userId) {
    return (dispatch, getState) => {
        const {authed} = getState();
        const {followings} = authed;
        const following = userId in followings && followings[userId] === 1 ? 0 : 1;
        dispatch(setFollowing(userId, following));
        syncFollowing(authed.accessToken, userId, following);
    }
}

export function toggleLike(songId) {
    return (dispatch, getState) => {
        const {authed} = getState();
        const {likes} = authed;
        const liked = songId in likes && likes[songId] === 1 ? 0 : 1;
        if (liked === 1) {
            dispatch(appendLike(songId));
        }
        dispatch(setLike(songId, liked));
        syncLike(authed.accessToken, songId, liked);
    };
}
