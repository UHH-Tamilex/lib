import Splitter from './splits.mjs';
import Apparatuser from './variants.mjs';

const _state = {
    curDoc: null
};

Splitter.sharedState = _state;
Apparatuser.sharedState = _state;

const loadDoc = async (fn,cache='no-cache') => {
    const res = await fetch(fn, {cache: cache});
    const xmltext = await res.text();
    return (new DOMParser()).parseFromString(xmltext, 'text/xml');
};
const startEditMode = async transliterator => {
    injectCSS();
    revealButtons();
    _state.curDoc = await loadDoc(window.location.pathname);
    const blocks = _state.curDoc.querySelectorAll('lg[*|id],p[*|id],div[*|id],div[*|id]');
    addEditButtons(blocks);
    document.getElementById('button_wordsplitbutton').addEventListener('click',Splitter.addWordSplits);
    document.getElementById('button_editbutton').addEventListener('click',Apparatuser.addVariants);
};

const addEditButtons = blocks => {for(const block of blocks) addEditButton(block);};

const addEditButton = blockel => {
    const xmlid = blockel.getAttribute('xml:id');
    const block = document.getElementById(xmlid);
    const editbutton = document.createElement('div');
    editbutton.className = 'editbutton ignored';
    editbutton.lang = 'en';
    editbutton.innerHTML = '<svg version="1.1" width="11" height="11" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"> <path d="M77.926,94.924H8.217C6.441,94.924,5,93.484,5,91.706V21.997c0-1.777,1.441-3.217,3.217-3.217h34.854 c1.777,0,3.217,1.441,3.217,3.217s-1.441,3.217-3.217,3.217H11.435v63.275h63.274V56.851c0-1.777,1.441-3.217,3.217-3.217 c1.777,0,3.217,1.441,3.217,3.217v34.855C81.144,93.484,79.703,94.924,77.926,94.924z"/> <path d="M94.059,16.034L84.032,6.017c-1.255-1.255-3.292-1.255-4.547,0l-9.062,9.073L35.396,50.116 c-0.29,0.29-0.525,0.633-0.686,1.008l-7.496,17.513c-0.526,1.212-0.247,2.617,0.676,3.539c0.622,0.622,1.437,0.944,2.274,0.944 c0.429,0,0.858-0.086,1.276-0.257l17.513-7.496c0.375-0.161,0.719-0.397,1.008-0.686l35.026-35.026l9.073-9.062 C95.314,19.326,95.314,17.289,94.059,16.034z M36.286,63.79l2.928-6.821l3.893,3.893L36.286,63.79z M46.925,58.621l-5.469-5.469 L73.007,21.6l5.47,5.469L46.925,58.621z M81.511,24.034l-5.469-5.469l5.716-5.716l5.469,5.459L81.511,24.034z"/> </svg>';
    editbutton.dataset.anno = `Edit apparatus for ${xmlid}`;
    //editbutton.addEventListener('click',editApp.bind(null,{block: xmlid}));
    block.prepend(editbutton);
};

const revealButtons = () => {
    for(const button of document.getElementById('topbar').querySelectorAll('button'))
        button.style.display = 'block';
};

const injectCSS = () => {
    const style = document.createElement('style');
    style.append(
`
#topbar {
    background: linear-gradient(rgb(255,255,248) 60%, rgba(255,255,255,0));
    height: auto;
    top: 0;
    padding-top: 1em;
    padding-bottom: 2em;
    z-index: 2;
    backdrop-filter: blur(1px);
    flex-direction: row;
}
#buttoncontainer {
    top: auto;
}
`
    );
    document.head.appendChild(style);
};

export default startEditMode;