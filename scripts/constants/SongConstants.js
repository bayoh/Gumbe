export const CHANGE_TYPES = {
    NEXT: 'next',
    PLAY: 'play',
    SHUFFLE: 'shuffle'
};

export const GENRES = [
    'Afro Beats',
    'dance',
    'booboo',
    'Hip Hop',
    'Hip Life',
    'high life',
    'palm-wine',
    'Azonto'
];

export const GENRES_MAP = (function(){
    let result = {};
    GENRES.forEach(function(genre){
        result[genre] = 1;
    });

    return result;
})();


export const IMAGE_SIZES = {
    LARGE: 't300x300',
    XLARGE: 't500x500'
};
