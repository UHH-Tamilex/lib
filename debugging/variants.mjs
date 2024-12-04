import alignApparatus from './apparatus.mjs';
import { showSaveFilePicker } from '../js/native-file-system-adapter/es6.js';

var curDoc = null;
var newDoc = null;
const filename = window.location.pathname.split('/').pop();

const loadDoc = async () => {
    const res = await fetch(filename);
    const xmltext = await res.text();
    curDoc = (new DOMParser()).parseFromString(xmltext, 'text/xml');
};

const switchType = e => {
    const targ = e.target.closest('.switcher > div');
    if(!targ || targ.classList.contains('selected')) return;
    
    
    const fileselect = document.getElementById('variantsfileselect');
    const textinput = document.getElementById('variantsinput');

    targ.classList.add('selected');
    if(targ.textContent === 'From file') {
        targ.nextElementSibling.classList.remove('selected');
        fileselect.style.display = 'block';
        textinput.style.display = 'none';
    }
    else {
        targ.previousSibling.classList.remove('selected');
        fileselect.style.display = 'none';
        textinput.style.display = 'flex';
    }

};
const addVariants = () => {
    /*
    const popup = document.createElement('div');
    popup.className = 'popup';
    */
    //const selector = document.createElement('select');
    const blackout = document.getElementById('blackout');
    document.getElementById('splits-popup').style.display = 'none';
    const popup = document.getElementById('variants-popup');
    const selector = popup.querySelector('select');
    for(const lg of document.querySelectorAll('.lg')) {
        if(!lg.id) continue;
        const option = document.createElement('option');
        option.value = lg.id;
        option.append(lg.id);
        selector.append(option);
    }
    
    findAlignmentFile();

    document.getElementById('variantsswitcher').addEventListener('click',switchType);
    document.getElementById('addapparatus').addEventListener('click',generateApp);
    document.getElementById('saveapparatus').addEventListener('click',saveAs);
    popup.querySelector('input[name="teifile"]').addEventListener('change',getFile);
    selector.addEventListener('change',findAlignmentFile);

    popup.style.display = 'flex';
    blackout.style.display = 'flex';
    blackout.addEventListener('click',cancelPopup);
};

const findAlignmentFile = async () => {
    const filefinder = document.getElementById('filefinder');
    const popup = document.getElementById('variants-popup');
    popup.querySelector('.output-boxen').style.display = 'none';
    const blockid = popup.querySelector('select[name="edblock"]').value;
    const srcname = `alignments/${blockid}.xml`;
    const res = await fetch(srcname);
    if(!res.ok) {
        filefinder.style.display = 'none';
        popup.querySelector('label[for="teifile"]').textContent = 'Select alignment file...';
        return;
    }
    const xmltext = await res.text();
    document.getElementById('foundfile').textContent = srcname;
    document.getElementById('usefoundfile').addEventListener('click',() => {
        getFile({alignment: {text: xmltext, filename: srcname}});     
    });
    filefinder.style.display = 'block';
    popup.querySelector('label[for="teifile"]').textContent = 'Use a different file...';
};

const saveAs = async () => {
    const fileHandle = await showSaveFilePicker({
        suggestedName: filename,
        types: [
            { description: 'TEI XML', accept: { 'text/xml': [ '.xml'] } }
        ],
    });
    const serialized = (new XMLSerializer()).serializeToString(newDoc);
    const file = new Blob([serialized], {type: 'text/xml;charset=utf-8'});
    const writer = await fileHandle.createWritable();
    writer.write(file);
    writer.close();
};

const generateApp = async e => {

    if(!curDoc) await loadDoc();

    const popup = document.getElementById('variants-popup');
    const blockid = popup.querySelector('select[name="edblock"]').value;
    const listApp = await alignApparatus(curDoc, blockid);


    const outputboxen = popup.querySelector('.output-boxen');
    outputboxen.style.display = 'block';
    const output = outputboxen.querySelector('.popup-output');
    output.innerHTML = '';
    output.style.display = 'block';
    output.style.border = '1px solid black';
    output.style.whiteSpace = 'break-spaces';
    output.style.height = '600px';
    output.style.width = '100%';

    if(listApp.hasOwnProperty('errors'))
        output.innerHTML = listApp.errors.join('<br>');
    else {
        newDoc = curDoc.cloneNode(true);
        let curStandOff = newDoc.querySelector(`standOff[type="apparatus"][corresp="#${blockid}"]`);
        if(!curStandOff) {
            curStandOff = newDoc.createElementNS('http://www.tei-c.org/ns/1.0','standOff');
            curStandOff.setAttribute('corresp',`#${blockid}`);
            curStandOff.setAttribute('type','apparatus');
        }
        newDoc.documentElement.appendChild(curStandOff);
        curStandOff.innerHTML = listApp.output;
        const standOff = curStandOff.outerHTML;
        output.innerHTML = Prism.highlight(standOff, Prism.languages.xml, 'xml');
        if(listApp.warnings) {
            const warnp = document.createElement('p');
            warnp.innerHTML = listApp.warnings.join('<br>');
            output.prepend(warnp);
        }
        copyToClipboard(standOff,popup);

        document.getElementById('saveapparatus').style.display = 'block';
    }
};

const cancelPopup = (e) => {
    const targ = e.target.closest('.closeicon svg');
    if(!targ) return;


    const blackout = document.getElementById('blackout');
    blackout.style.display = 'none';
    blackout.querySelector('select').innerHTML = '';

    const popup = document.getElementById('variants-popup');
    const outputboxen = popup.querySelector('.output-boxen');
    const output = outputboxen.querySelector('.popup-output');
    popup.style.display = 'none';
    outputboxen.style.display = 'none';
    output.innerHTML = '';

};

const readOne = async (file) => {
    const reader = new FileReader();
    return new Promise(res => {
        reader.onload = () => res(reader.result);
        reader.readAsText(file);
    });
};
const parseString = (str,fname) => {
    const parser = new DOMParser();
    const newd = parser.parseFromString(str,'text/xml');
    if(newd.documentElement.nodeName === 'parsererror')
        alert(`${fname} could not be loaded. Please contact your friendly local system administrator. Error: ${newd.documentElement.textContent}`);
    else
        return newd;
};
const getFile = async (e) => {
    const popup = document.getElementById('variants-popup');
    const blockid = popup.querySelector('select[name="edblock"]').value;
    const alignment = e.alignment;

    if(!curDoc) await loadDoc();

    let xml = alignment ?
        parseString(alignment.text) :
        await (async () => {
            const input = document.getElementById('teifile');
            const file = input.files[0];
            const text = await readOne(file);
            return parseString(text,file.name);
        })();

    const app = await makeApp(xml, {
        base: document.querySelector('.text-siglum').textContent,
        normlem: document.getElementById('normlem').checked, 
        mergerdgs: document.getElementById('mergerdgs').checked,
        blockid: blockid
    });
    //popup.style.height = '80%';
    //popup.querySelector('.boxen').style.height = 'unset';

    const outputboxen = popup.querySelector('.output-boxen');
    outputboxen.style.display = 'block';
    const output = outputboxen.querySelector('.popup-output');
    output.innerHTML = '';
    output.style.display = 'block';
    output.style.border = '1px solid black';
    output.style.whiteSpace = 'break-spaces';
    output.style.height = '600px';
    output.style.width = '100%';
    
    if(app.error) {
        output.innerHTML = app.error;
        return;
    }    
    newDoc = curDoc.cloneNode(true);
    let curStandOff = newDoc.querySelector(`standOff[type="apparatus"][corresp="#${blockid}"]`);
    if(!curStandOff) {
        curStandOff = newDoc.createElementNS('http://www.tei-c.org/ns/1.0','standOff');
        curStandOff.setAttribute('corresp',`#${blockid}`);
        curStandOff.setAttribute('type','apparatus');
    }

    if(alignment)
        curStandOff.setAttribute('source',alignment.filename);
    curStandOff.innerHTML = app;

    newDoc.documentElement.appendChild(curStandOff);
    //const standOff = `<standOff type="apparatus" corresp="#${blockid}">\n<listApp>\n${app}\n</listApp>\n</standOff>`;
    const standOff = curStandOff.outerHTML;
    output.innerHTML = Prism.highlight(standOff, Prism.languages.xml, 'xml');
    copyToClipboard(standOff,popup);

    document.getElementById('saveapparatus').style.display = 'block';
};

const copyToClipboard = async (xml,popup) => {
    const par = popup.querySelector('.popup-output');
    const tip = document.createElement('div');
    tip.style.position = 'absolute';
    tip.style.top = 0;
    tip.style.right = 0;
    tip.style.background = 'rgba(0,0,0,0.5)';
    tip.style.color = 'white';
    tip.style.padding = '0.5rem';
    try {
        await navigator.clipboard.writeText(xml);
        tip.append('Copied to clipboard.');
        par.appendChild(tip);
        tip.animate([
            {opacity: 0},
            {opacity: 1, easing: 'ease-in'}
            ],200);
    } catch {
        const tip = document.createElement('div');
        tip.style.color = 'red';
        tip.append('Couldn\'t copy to clipboard.');
        par.appendChild(tip);
    }
    setTimeout(() => tip.remove(),1000);
};
const mergeGroups = (doc) => {
    const els = doc.querySelectorAll('cl');
    for(const el of els) {
        const firstw = el.removeChild(el.firstElementChild);
        while(el.firstElementChild) {
            const norm1 = firstw.getAttribute('lemma') || firstw.textContent;
            const norm2 = el.firstElementChild.getAttribute('lemma') || el.firstElementChild.textContent;
            firstw.setAttribute('lemma',norm1 + norm2);
            while(el.firstElementChild.firstChild)
                firstw.appendChild(el.firstElementChild.firstChild);
            el.firstElementChild.remove();
        }
        if(firstw.getAttribute('lemma') === firstw.textContent)
            firstw.removeAttribute('lemma');
        el.parentNode.insertBefore(firstw,el);
        el.parentNode.removeChild(el);
    }
};

const makeSorter = order => {
    return (a,b) => {
        const aindex = order.indexOf(a);
        const bindex = order.indexOf(b);
        return aindex > bindex;
    };
};

const getWitList = (doc, sorter, arr) => {
    const listWit = doc.querySelector('listWit');
    const wits = new Set(arr);
    const newwits = new Set();
    for(const wit of wits) {
        const witel = listWit.querySelector(`witness[*|id="${wit}"]`);
        const type = witel.getAttribute('type');
        const par = witel.parentNode;
        const parid = par.nodeName === 'witness' ? par.getAttribute('xml:id') : null;
        const ac = parid && par.querySelector('witness[type="ac"]')?.getAttribute('xml:id');
        const pc = parid && par.querySelector('witness[type="pc"]')?.getAttribute('xml:id');

        if(!type) {
            if( (parid && wits.has(parid)) || 
                (ac && pc && wits.has(ac) && wits.has(pc)) ) 
                continue;
            else newwits.add(wit);
        }
        else if(type === 'ac' && pc && wits.has(pc)) {
                newwits.add(parid);
        }
        else if(type === 'pc' && ac && wits.has(ac)) {
                newwits.add(parid);
        }
        else newwits.add(wit);
    }
    if(sorter)
        return `wit="${[...newwits].sort(sorter).map(w => '#' + w).join(' ')}"`;
    else
        return `wit="${[...newwits].map(w => '#' + w).join(' ')}"`;
};

const curry = f => {
    return a => {
        return b => {
            return c => {
                return f(a,b,c);
            };
        };
    };
};

/*
const fetchFile = async fn => {
    const response = await fetch(fn);
    const str = await response.text();
    return str;
};
const loadOtherTEI = async (listWit) => {
    const files = new Map();
    const wits = new Map();
    for(const witel of listWit.querySelectorAll('witness')) {
        const filename = witel.closest('[source]').getAttribute('source');
        if(!files.has(filename)) files.set(filename,parseString(await fetchFile(filename),filename));

        wits.set(witel.getAttribute('xml:id'), {
            file: files.get(filename),
            type: witel.getAttribute('type'),
            subtype: witel.getAttribute('subtype')
        });
    }

    return wits;
};

const getStart = (el, n) => {
    const ws = el.querySelectorAll('w');
    let ret = 0;
    for(const w of ws) {
       if(w.getAttribute('n') === 'n') break;
       ret = ret + w.textContent.length;
    }
    return ret;
};

const getTEIRdg = (witfile, blockid, positions) => {
    const block = witfile.file.querySelector(`[*|id="${blockid}"], [corresp="#${blockid}"]`);
    const type = witfile.type;
    const subtype = witfile.subtype;

    const walker = block.ownerDocument.createTreeWalker(block,NodeFilter.SHOW_ALL, { acceptNode() {return NodeFilter.FILTER_ACCEPT;}});
    let start = 0;
    let started = false;
    const range = new Range();

    while(walker.nextNode()) {
        const cur = walker.currentNode;

        if(cur.nodeType === 1) {
            if(cur.nodeName === 'lem' && type && type !== 'ac' && type !== 'pc') continue;
            if(cur.nodeName === 'add' && type === 'ac') continue;
            if(cur.nodeName === 'del' && type !== 'ac') continue;
            if(cur.nodeName === 'rdg' && !cur.getAttribute('wit').split(' ').includes(subtype)) continue;
        }
        
        else if(cur.nodeType === 3) {
            const nodecount = cur.data.length;
            const end = start + nodecount;
            if(!started && positions[0] <= end) {
                const realpos = positions[0]-start;
                range.setStart(cur,realpos);
                started = true;
            }
            if(positions[1] <= end) {
                const realpos = positions[1]-start;
                range.setEnd(cur,realpos);
                break;
            }
            start = end;
        }
    }
    const div = document.createElement('div');
    div.appendChild(range.cloneContents());
    return div.innerHTML.trim();
};

const getTEIRdgs = (rdgs,blockid,witdocs,alignment,dataN) => {
    const newrdgs = new Map();
    for(const [rdg,wits] of rdgs) {
        for(const wit of wits) {
            const witfile = witdocs.get(wit);
            const row = alignment.querySelector(`TEI[n="${wit}"] text`);
            const startcount = getStart(row,dataN);
            const endcount = startcount + rdg.length;
            console.log(`${wit}, ${rdg}`);
            const xmlrdg = getTEIRdg(witfile,blockid,[startcount,endcount]);
            
            const newentry = newrdgs.get(xmlrdg) || [];
            newentry.push(wit);
            newrdgs.set(xmlrdg,newentry);
        }
    }
    return newrdgs;
};
*/

const getWitOrder = el => {
    return [...el.querySelectorAll('witness')].map(w => w.getAttribute('xml:id'));
};

const makeApp = async (doc, opts) =>  {
    const base = doc.querySelector(`TEI[n="${opts.base}"]`);
    if(!base) return {error: `${opts.base} not found in alignment file.`};
    if(opts.mergerdgs) mergeGroups(doc);
    
    const curListWit = curDoc.querySelector('listWit');

    const sorter = curListWit ? makeSorter(getWitOrder(curListWit)) : null;
    
    const curriedWitList = curry(getWitList)(doc)(sorter);
    
    //const witdocs = await loadOtherTEI(doc.querySelector('listWit'));

    let ret = '';
    let start = 0;
    const words = doc.querySelector(`TEI[n="${opts.base}"]`).querySelectorAll('w');
    for(const word of words) {
        const dataN = word.getAttribute('n');

        const lemma = opts.normlem ? 
            (word.getAttribute('lemma') || word.textContent.trim()) :
            word.textContent.trim();

        const end = start + word.textContent.replaceAll(/\s/g,'').length; // TODO: skip some elements
        let app = `<app corresp="${start},${end}">\n`;

        const posapp = new Set();
        const negapp = new Map();
        const otherwords = doc.querySelectorAll(`TEI:not([n="${opts.base}"]) w[n="${dataN}"]`);
        for(const otherword of otherwords) {
            const id = otherword.closest('TEI').getAttribute('n');
            const trimmed = otherword.textContent.trim();
            if(opts.normlem && otherword.getAttribute('lemma') === lemma)
                posapp.add(id);
            else if(trimmed === lemma)
                posapp.add(id);
            else {
                /*
                const newstr = otherword.textContent === '' ? 
                    '[om.]' : 
                    otherword.textContent;
                */
                const newstr = normlem ? 
                    otherword.getAttribute('lemma') || trimmed : 
                        trimmed;
                const negwits = negapp.get(newstr) || new Map();
                const negrdg = negwits.get(trimmed) || [];
                negrdg.push(id);
                negwits.set(trimmed,negrdg);
                negapp.set(newstr,negwits);
            }
        }

        start = end;
        
        if(negapp.size === 0)
            continue;
        
        const poswits = curriedWitList(posapp);
        app = app + `  <lem ${poswits}>${word.innerHTML.trim()}</lem>\n`;
        
        for(const rdg of negapp.values()) {
            /*
            const newrdgs = getTEIRdgs(rdg,opts.blockid,witdocs,doc,dataN);
            const rdgstr = newrdgs.keys().next().value;
            const negwits = curriedWitList([...newrdgs.values()].flat());
            const allwits = [...newrdgs];
            */
            const rdgstr = rdg.keys().next().value;
            const negwits = curriedWitList([...rdg.values()].flat());
            const allwits = [...rdg];
            allwits.shift();

            if(allwits.length === 0)
                app = app + `  <rdg ${negwits}>${rdgstr}</rdg>\n`;
            else {
                const morerdgs = allwits.map(e => {
                    const witstr = curriedWitList(e[1]);
                    return `<rdg type="sandhi" ${witstr}>${e[0]}</rdg>`;
                }).join('');
                app = app + `  <rdgGrp ${negwits}><rdg type="main">${rdgstr}</rdg>${morerdgs}</rdgGrp>\n`;
            }
        }
        app = app + '</app>\n';    

        ret = ret + app;
    }

    return `<listApp>\n${ret}\n</listApp>\n` + 
        (curListWit ? '' : new XMLSerializer().serializeToString(doc.querySelector('listWit')));
};

export { addVariants };
