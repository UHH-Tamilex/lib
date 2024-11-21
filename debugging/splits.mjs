import { alignWordsplits, findGrammar, gramMap } from './aligner.mjs';
import { Sanscript } from '../js/sanscript.mjs';
import makeAlignmentTable from './alignmenttable.mjs';
import { showSaveFilePicker } from '../js/native-file-system-adapter/es6.js';
import { init as cmWrapper } from './cmwrapper.mjs';
import { serializeWordsplits, getEditionText } from './serializeStandOff.mjs';

const _state = {
    curDoc: null,
    newDoc: null,
    noteCM: null,
    tamlines: null,
    wordsplits: null,
    changed: false
};

const filename = window.location.pathname.split('/').pop();

const addWordSplits = () => {
    const blackout = document.getElementById('blackout');
    const popup = document.getElementById('splits-popup');
    const selector = popup.querySelector('select');
    for(const lg of document.querySelectorAll('.lg')) {
        if(!lg.id) continue;
        const option = document.createElement('option');
        option.value = lg.id;
        option.append(lg.id);
        selector.append(option);
    }
    fillWordSplits({target: selector});
    selector.addEventListener('change',maybeFillWordSplits);
    
    document.getElementById('alignbutton').addEventListener('click',showSplits);
    document.getElementById('saveasbutton').addEventListener('click',saveAs);
    document.querySelector('#splits-popup .popup-output').addEventListener('click',listEdit.click);
    document.querySelector('#splits-popup .popup-output').addEventListener('keydown',listEdit.keydown);
    document.querySelector('#splits-popup .popup-output').addEventListener('focusin',listEdit.focusin);
    for(const ta of document.querySelectorAll('#splits-popup textarea'))
        ta.addEventListener('change',() => {_state.changed = true;});

    blackout.style.display = 'flex';
    popup.style.display = 'flex';
    blackout.addEventListener('click',cancelPopup);
    document.getElementById('previewswitcher').addEventListener('click',codePreview);
    document.getElementById('notesswitcher').addEventListener('click',notesView);
};
const codePreview = e => {
    const targ = e.target.closest('.switcher > div');
    if(!targ || targ.classList.contains('selected')) return;
    
    const output = document.querySelector('#splits-popup .popup-output');

    targ.classList.add('selected');
    if(targ.textContent === 'Preview') {
        targ.nextElementSibling.classList.remove('selected');
        output.querySelector('table').style.display = 'table';
        output.querySelector('.code').style.display = 'none';
    }
    else {
        targ.previousSibling.classList.remove('selected');
        output.querySelector('table').style.display = 'none';
        output.querySelector('.code').style.display = 'block';
    }

};

const notesView = e => {
    const targ = e.target.closest('.switcher > div');
    if(!targ || targ.classList.contains('selected')) return;
    
    const wbwbox = document.getElementById('wbwbox');
    const tbs = wbwbox.querySelectorAll('textarea');
    
    targ.classList.add('selected');
    if(targ.textContent === 'Splits') {
        targ.nextElementSibling.classList.remove('selected');
        tbs[0].style.display = 'block';
        //tbs[1].style.display = 'none';
        _state.noteCM.toTextArea();
    }
    else {
        targ.previousSibling.classList.remove('selected');
        tbs[0].style.display = 'none';
        //tbs[1].style.display = 'block';
        _state.noteCM = cmWrapper(tbs[1]);
        _state.noteCM.setSize(null,'auto');
    }

};

const realNextSibling = (walker) => {
    let cur = walker.currentNode;
    while(cur) {
        const sib = walker.nextSibling();
        if(sib) return sib;
        cur = walker.parentNode();
    }
    return null;
};
const countWalker = el => {
    const walker = document.createTreeWalker(el,NodeFilter.SHOW_ALL);
    let count = 0;
    let cur = walker.currentNode;
    while(cur) {
        if(cur.nodeType === 1) {
            if(cur.nodeName === 'choice' && 
               cur !== cur.parentNode.children[0]) {
                cur = realNextSibling(walker);
                continue;
            }
            else if(cur.nodeName === 'gap')
                count = count + parseInt(cur.getAttribute('quantity') || 1);
        }
        if(cur.nodeType === 3)
            count = count + cur.textContent
                               .trim()
                               .replaceAll(/[\s\u00AD]/g,'')
                               .length;
        cur = walker.nextNode();
    }
    return count;
};

const loadDoc = async () => {
    const res = await fetch(filename);
    const xmltext = await res.text();
    _state.curDoc = (new DOMParser()).parseFromString(xmltext, 'text/xml');
};

const maybeFillWordSplits = (e) => {
    if(!_state.changed)
        fillWordSplits(e);
    else if(window.confirm('Are you sure? Changes will be lost.')) {
        fillWordSplits(e);
        _state.changed = false;
    }
};

const fillWordSplits = async (e) => {
    if(!_state.curDoc) await loadDoc();
    const selected = e.target.options[e.target.options.selectedIndex].value;
    const standOff = _state.curDoc.querySelector(`standOff[type="wordsplit"][corresp="#${selected}"]`);

    if(!standOff) {
        clearSplits();
        return;
    }

    const ret = serializeWordsplits(standOff);
    
    const textareas = document.querySelectorAll('#splits-popup textarea');
    textareas[0].value = ret.tam;
    textareas[1].value = ret.eng;
    textareas[2].value = ret.notes.join('\n\n');

    resetOutput();
};

const resetOutput = () => {
    document.getElementById('alignbutton').innerHTML = 'Align';
    document.getElementById('saveasbutton').style.display = 'none';
    const popup = document.getElementById('splits-popup');
    popup.querySelector('.output-boxen').style.display = 'none';
    popup.querySelector('.popup-output').innerHTML = '';
    popup.querySelector('.popup-warnings').innerHTML = '';
};

const clearSplits = () => {
    const popup = document.getElementById('splits-popup');
    for(const textarea of popup.querySelectorAll('textarea'))
        textarea.value = '';
};

const cancelPopup = (e) => {
    const targ = e.target.closest('.closeicon svg');
    if(!targ) return;

    const blackout = document.getElementById('blackout');
    blackout.style.display = 'none';
    blackout.querySelector('select').innerHTML = '';
    for(const textarea of blackout.querySelectorAll('textarea'))
        textarea.value = '';
    resetOutput();
};

const getNotes = str => {
    const tempdoc = (new DOMParser()).parseFromString(`<TEI xmlns="http://www.tei-c.org/ns/1.0">${str}</TEI>`, 'text/xml');
    const serializer = new XMLSerializer();
    return [...tempdoc.documentElement.children].map(c => serializer.serializeToString(c));
};

const showSplits = async () => {
    if(!_state.curDoc) await loadDoc();
    if(_state.noteCM) _state.noteCM.save();

    const popup = document.getElementById('splits-popup');
    popup.querySelector('.boxen').style.height = 'unset';

    document.getElementById('alignbutton').innerHTML = 'Re-align';
    document.getElementById('saveasbutton').style.display = 'block';
    document.getElementById('saveasbutton').disabled = false;
    document.getElementById('saveasbutton').title = '';

    popup.querySelector('.output-boxen').style.display = 'flex';

    const output = popup.querySelector('.popup-output');
    output.innerHTML = '<div style="display: flex;width: 100%;justify-content:center"><div class="spinner"></div></div>';

    const debugbox = popup.querySelector('.popup-warnings');
    debugbox.innerHTML = '';

    const inputs = popup.querySelectorAll('textarea');
    const tamval = Sanscript.t(inputs[0].value.replaceAll(/[\d∞]/g,'').trim(),'tamil','iast').replaceAll(/u\*/g,'*');
    //const tam = tamval.split(/\s+/).map(s => s.replace(/[,.;?!]$/,''));
    const tamlines = tamval.replaceAll(/[,.;?!](?=\s|$)/g,'').split(/\n+/);
    _state.tamlines = tamlines;
    const tam = tamlines.reduce((acc,cur) => acc.concat(cur.trim().split(/\s+/)),[]);

    const engval = inputs[1].value.trim();
    const eng = engval ? engval.split(/\s+/) : //.map(s => s.replace(/[,.;?!]$/,'')) :
                         Array(tam.length).fill('');

    if(engval) {
        const englines = engval.split(/\n+/);
        for(let n=0;n<tamlines.length;n++) {
            if(tamlines[n].trim().split(/\s+/).length !== englines[n].trim().split(/\s+/).length) {
                
                debugbox.innerHTML = (`<div>Line ${n+1}: Tamil & English don't match.</div>`);
                output.style.border = 'none';
                output.style.display = 'none';
                return;
            }
        }
    }

    const blockid = popup.querySelector('select').value;
    /*
    const textblock = document.getElementById(blockid).querySelector('.text-block');
    const text = Transliterate.getCachedText(textblock);
    */
    const textblock = _state.curDoc.querySelector(`[*|id="${blockid}"]`);
    const edition = textblock.querySelector('[type="edition"]');
    let text = edition ? getEditionText(edition) : getEditionText(textblock);

    const notes = getNotes(inputs[2].value);
    const lookup = popup.querySelector('input[name="lookup"]').checked;
    const ret = await alignWordsplits(text,tam,eng,notes,lookup);
    const tables = makeAlignmentTable(ret.alignment,tamlines.map(l => l.replaceAll(/\/.+?(?=\s|$)/g,'')),ret.warnings);
    
    debugbox.append(...tables);
    
    _state.wordlist = ret.wordlist;

    if(lookup) inputs[1].value = refreshTranslation(tamlines,ret.wordlist);

    output.style.display = 'block';
    output.style.border = '1px solid black';

    const standOff =`<standOff xmlns="http://www.tei-c.org/ns/1.0" type="wordsplit" corresp="#${blockid}">\n${ret.xml}\n</standOff>`;
    const xproc = new XSLTProcessor();
    const resp = await fetch('lib/debugging/wordlist.xsl');
    const parser = new DOMParser();
    const xslsheet = parser.parseFromString(await resp.text(), 'text/xml');
    xproc.importStylesheet(xslsheet);
    //const res = xproc.transformToDocument(parser.parseFromString(`<standOff xmlns="http://www.tei-c.org/ns/1.0" type="wordsplit">${ret.xml}</standOff>`,'text/xml')).querySelector('table');
    const res = xproc.transformToDocument(parser.parseFromString(standOff,'text/xml')).querySelector('table');
    if(document.getElementById('transbutton').lang === 'en')
        for(const th of res.querySelectorAll('[lang="ta-Latn"]')) {
            th.textContent = Sanscript.t(th.textContent,'iast','tamil');
            th.lang = 'ta-Taml';
        }

    output.innerHTML = '';
    output.appendChild(res);
    _state.newDoc = _state.curDoc.cloneNode(true);
    let curStandOff = _state.newDoc.querySelector(`standOff[type="wordsplit"][corresp="#${blockid}"]`);
    if(!curStandOff) {
        curStandOff = _state.newDoc.createElementNS('http://www.tei-c.org/ns/1.0','standOff');
        curStandOff.setAttribute('corresp',`#${blockid}`);
        curStandOff.setAttribute('type','wordsplit');
        _state.newDoc.documentElement.appendChild(curStandOff);
    }
    curStandOff.innerHTML = `\n${ret.xml}\n`;

    const code = document.createElement('div');
    code.classList.add('code');
    code.style.display = 'none';
    code.innerHTML = Prism.highlight(standOff,Prism.languages.xml,'xml');
    output.appendChild(code);
   
    const switches = document.getElementById('previewswitcher').children;
    switches[0].classList.add('selected');
    switches[1].classList.remove('selected');

    copyToClipboard(standOff,popup);
};

const refreshTranslation = (lines,wordlist) => {
    let ret = '';
    const makeWord = (obj) => {
        let trans = obj.translation;
        if(obj.gram && obj.gram.length > 0)
            trans = trans + '(' + obj.gram.join('|') + ')';
        if(trans === '') trans = '()';
        if(obj.wordnote) trans = trans + '*';
        return trans;
    };

    let w = 0;
    for(const line of lines) {
        const wordsinline = line.trim().split(/\s+/).length;
        for(let n=0;n<wordsinline;n++) {
            ret = ret + makeWord(wordlist[w]) + ' ';
            w = w + 1;
        }
        ret = ret + '\n';
    }
    return ret;
};

const saveAs = async () => {
    const fileHandle = await showSaveFilePicker({
        suggestedName: filename,
        types: [
            { description: 'TEI XML', accept: { 'text/xml': [ '.xml'] } }
        ],
    });
    const serialized = (new XMLSerializer()).serializeToString(_state.newDoc);
    const file = new Blob([serialized], {type: 'text/xml;charset=utf-8'});
    const writer = await fileHandle.createWritable();
    writer.write(file);
    writer.close();
};

const copyToClipboard = (xml,popup) => {
    navigator.clipboard.writeText(xml).then(
        () => {
            const par = popup.querySelector('.popup-output');
            const tip = document.createElement('div');
            tip.style.position = 'absolute';
            tip.style.top = 0;
            tip.style.right = 0;
            tip.style.background = 'rgba(0,0,0,0.5)';
            tip.style.color = 'white';
            tip.style.padding = '0.5rem';
            tip.append('Copied to clipboard.');
            par.appendChild(tip);
            tip.animate([
                {opacity: 0},
                {opacity: 1, easing: 'ease-in'}
                ],200);
            setTimeout(() => tip.remove(),1000);
        },
        () => {
            const par = popup.querySelector('.popup-output');
            const tip = document.createElement('div');
            tip.style.position = 'absolute';
            tip.style.top = 0;
            tip.style.right = 0;
            tip.style.background = 'rgba(0,0,0,0.5)';
            tip.style.color = 'red';
            tip.style.padding = '0.5rem';
            tip.append('Couldn\'t copy to clipboard.');
            par.appendChild(tip);
            setTimeout(() => tip.remove(),1000);
        }
    );
};

const listEdit = {};

listEdit.keydown = e => {
    if(e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
    }
    else if(e.key === 'Tab' && e.target.classList.contains('gramGrp')) {
        e.preventDefault();
        const next = !e.shiftKey ?  
            e.target.closest('tr').nextElementSibling :
            e.target.closest('tr').previousElementSibling;
        e.target.blur();
        if(next)
            next.querySelector('.gramGrp').click();
    }
};

listEdit.blur = e => {
    if(_state.editState !== e.target.textContent)
        _state.changed = true;
    _state.editState = null;

    if(e.target.classList.contains('gramGrp')) {
        e.target.contentEditable = false;
        listEdit.updateGrams(e);
    }
    else
        listEdit.updateWord(e);
    document.getElementById('saveasbutton').disabled = true;
    document.getElementById('saveasbutton').title = 'Realign first';
    document.querySelector('#wbwbox textarea').value = refreshTranslation(_state.tamlines,_state.wordlist);
    e.target.blur();
};

listEdit.focusin = e => {
    if(e.target.spellcheck === true) {
        _state.editState = e.target.textContent;
        e.target.addEventListener('blur',listEdit.blur,{once: true});
    }
};

listEdit.click = e => {
    if(e.target.classList.contains('gramGrp')) {
        const row = e.target.closest('tr');
        const index = [...row.parentNode.children].indexOf(row);
        const grams = _state.wordlist[index].gram;
        if(grams && grams.length > 0)
                e.target.innerHTML = '(' + grams.join('|') + ')';
        else
            e.target.innerHTML = '()';
        _state.editState = e.target.innerHTML;
        e.target.contentEditable = true;
        e.target.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(e.target.firstChild,e.target.firstChild.data.length -1);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        
        e.target.addEventListener('blur',listEdit.blur,{once: true});
    }
};

listEdit.updateGrams = e => {
    const row = e.target.closest('tr');
    const index = [...row.parentNode.children].indexOf(row);
    const transgram = _state.wordlist[index].translation + e.target.innerHTML;
    const ret = findGrammar(transgram);
    const def = row.querySelector('[spellcheck="true"]');
    if(ret) {
        _state.wordlist[index].gram = ret.gram;
        _state.wordlist[index].translation = ret.translation;
        def.innerHTML = ret.translation;
        e.target.innerHTML = ret.gram.map(g => gramMap.get(g)).join('<br>');
    }
    else {
        _state.wordlist[index].gram = [];
        _state.wordlist[index].translation = transgram;
        def.innerHTML = transgram;
        e.target.innerHTML = '';
    }
};

listEdit.updateWord = e => {
    const row = e.target.closest('tr');
    const index = [...row.parentNode.children].indexOf(row);
    _state.wordlist[index].translation = e.target.textContent.replaceAll(/\s/g,'_');

};
/*
const addcsvwordsplit = (e) => {
    Papa.parse(e.target.files[0], {
        complete: (res) => {
            const data = res.data;
            if(data[0][0] === 'Word') data.shift();
            showsplits(data);
        }
    });
};
const showsplits = (arr) => {
    const concated = arr.map(el => el[0]).join(' ');
    const textblock = document.querySelector('.text-block');
    const text = textblock.textContent.replaceAll('\u00AD','');
    const aligned = NeedlemanWunsch(text,concated);
    const splits = alignmentToSplits(aligned,arr.map(el => el[1]));
    const id = textblock.closest('[id]').id;
    
    const ret = `<standOff corresp="#${id}" type="wordsplit">\n` + 
        makeEntries(splits).join('\n') +
        '\n</standOff>';

    makepopup(ret);
};
const makepopup = (str) => {
    const popup = document.createElement('div');
    popup.className = 'popup';
    const code = document.createElement('code');
    code.className = 'language-xml';
    code.style.whiteSpace = 'pre';
    code.append(str);
    popup.append(code);
    const blackout = document.createElement('div');
    blackout.id = 'blackout';
    blackout.append(popup);
    Prism.highlightAllUnder(popup);
    document.body.appendChild(blackout);
    blackout.addEventListener('click',(e) => {
        const targ = e.target.closest('.popup');
        if(!targ)
            document.querySelector('#blackout').remove();
    });
};

const alignmentToSplits = (aligned, translations) => {
    let words = [];
    let wordstart = 0;
    let wordend = 0;
    let curword = '';
    for(let n=0; n<aligned[0].length;n++) {
        if(aligned[1][n].match(/[\n\s]/)) {
            const ret = {word: curword, start: wordstart, end: wordend};
            const translation = translations.shift();
            if(translation) ret.translation = translation;
            words.push(ret);

            curword = '';
            if(aligned[0][n].match(/[\n\s]/))
                wordstart = wordend + 1;
            else wordstart = wordend;
        }
        else {
            if(curword === '' && aligned[0][n].match(/[\n\s]/))
                wordstart = wordend + 1;
            curword += aligned[1][n];
        }

        if(aligned[0][n] !== '') wordend += 1;
    }
    if(curword) { // might be "" if wordsplit is only partial
        const ret = {word: curword, start: wordstart, end: wordend};
        const translation = translations.shift();
        if(translation) ret.translation = translation;
        words.push(ret);
    }

    return words;
};

const makeEntries = (list) => {
    const formatWord = (w) => {
        return w.replace(/([~+()])/g,'<pc>$1</pc>')
                .replaceAll(/['’]/g,'<pc>(</pc>u<pc>)</pc>')
                //.replaceAll(/\[(.+?)\]/g,'<supplied>$1</supplied>');
                .replaceAll(/\[(.+?)\]/g,'$1');
    };
    return list.map(e => {
        const select = e.hasOwnProperty('strand') ? ` select="${e.strand}"` : '';
        const translation = e.hasOwnProperty('translation') ? `\n    <def>${e.translation}</def>` : '';
        return `  <entry corresp="${e.start},${e.end}"${select}>\n    <form>${formatWord(e.word)}</form>${translation}\n</entry>`;
    });
};
*/

const Splitter = {
    addWordSplits: addWordSplits
};

export default Splitter;
