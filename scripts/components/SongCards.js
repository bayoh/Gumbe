import React, {Component, PropTypes} from 'react';
import {playSong} from '../actions/player';
import {fetchSongsIfNeeded} from '../actions/playlists';
import InfiniteScrollify from '../components/InfiniteScrollify';
import SongCard from '../components/SongCard';
import Spinner from '../components/Spinner';

class SongCards extends Component {
    constructor(props) {
        super(props);
        this.getScrollState = this.getScrollState.bind(this);
        this.onScroll = this.onScroll.bind(this);
        const {playlist, playlists} = props;
        const items = playlist in playlists ? playlists[playlist].items : [];
        this.state = {
            end: items.length,
            paddingBottom: 0,
            paddingTop: 0,
            start: 0
        };
    }

    componentDidMount() {
        window.addEventListener('scroll', this.onScroll, false);
    }

    componentWillReceiveProps(nextProps) {
        const {end, paddingBottom, paddingTop, start} = this.getScrollState(nextProps);
        if (paddingTop !== this.state.paddingTop
        || paddingBottom !== this.state.paddingBottom
        || start !== this.state.start
        || end !== this.state.end) {
            this.setState({
                end: end,
                paddingBottom: paddingBottom,
                paddingTop: paddingTop,
                start: start
            });
        }
    }

    componentWillUnmount() {
        window.removeEventListener('scroll', this.onScroll, false);
    }

    getScrollState(props) {
        const {height, playlists, playlist} = props;
        const items = playlist in playlists ? playlists[playlist].items : [];

        const MARGIN_TOP = 20;
        const ROW_HEIGHT = 132;
        const ITEMS_PER_ROW = 5;
        const scrollY = window.scrollY;
        let paddingTop = 0;
        let paddingBottom = 0;
        let start = 0;
        let end = items.length;

        if ((scrollY - ((ROW_HEIGHT * 3) + (MARGIN_TOP * 2))) > 0) {
            const rowsToPad = Math.floor((scrollY - ((ROW_HEIGHT * 2) + (MARGIN_TOP))) / (ROW_HEIGHT + MARGIN_TOP));
            paddingTop = rowsToPad * (ROW_HEIGHT + MARGIN_TOP);
            start = rowsToPad * ITEMS_PER_ROW;
        }

        const rowsOnScreen = Math.ceil(height / (ROW_HEIGHT + MARGIN_TOP));
        const itemsToShow = (rowsOnScreen + 5) * ITEMS_PER_ROW;
        if (items.length > (start + itemsToShow)) {
            end = start + itemsToShow;
            const rowsToPad = Math.ceil((items.length - end) / ITEMS_PER_ROW);
            paddingBottom = rowsToPad * (ROW_HEIGHT + MARGIN_TOP);
        }

        return {
            end,
            paddingBottom,
            paddingTop,
            start
        };
    }

    onScroll() {
        const {end, paddingBottom, paddingTop, start} = this.getScrollState(this.props);
        if (paddingTop !== this.state.paddingTop
        || paddingBottom !== this.state.paddingBottom
        || end !== this.state.end
        || start !== this.state.start) {
            this.setState({
                end: end,
                paddingBottom: paddingBottom,
                paddingTop: paddingTop,
                start: start
            });
        }
    }

    playSong(i, e) {
        e.preventDefault();
        const {playlist, dispatch} = this.props;
        dispatch(playSong(playlist, i));
    }

    renderSongs(start, end) {
        const chunk = 5;
        const {authed, dispatch, playlist, playlists, playingSongId, songs, users} = this.props;
        const items = playlist in playlists ? playlists[playlist].items : [];
        let result = [];
        for (let i = start; i < end; i += chunk) {
            let songCards = items.slice(i, i + chunk).map((songId, j) => {
                const song = songs[songId];
                const user = users[song.user_id];
                const index = i + j;
                return (
                    <div className='col-1-5' key={index + '-' + song.id}>
                        <SongCard
                            authed={authed}
                            dispatch={dispatch}
                            isActive={song.id === playingSongId}
                            playSong={this.playSong.bind(this, index)}
                            scrollFunc={fetchSongsIfNeeded.bind(null, playlist)}
                            song={song}
                            user={user} />
                    </div>
                );
            }, this);

            if (songCards.length < chunk) {
                for (let j = 0; j < chunk - songCards.length + 1; j++) {
                    songCards.push(<div className='col-1-5' key={'song-placeholder-' + (i + j)}></div>);
                }
            }

            result.push(
                <div className='songs-row grid' key={'songs-row-' + i}>{songCards}</div>
            );
        }

        return result;
    }

    render() {
        const {playlist, playlists} = this.props;
        const {end, paddingBottom, paddingTop, start} = this.state;
        const isFetching = playlist in playlists ? playlists[playlist].isFetching : false;


        return (
            <div className='content'>
                <div className='padder' style={{height: paddingTop}}></div>
                {this.renderSongs(start, end)}
                <div className='padder' style={{height: paddingBottom}}></div>
                {isFetching ? <Spinner /> : null}
            </div>
        );
    }
}

export default InfiniteScrollify(SongCards);
