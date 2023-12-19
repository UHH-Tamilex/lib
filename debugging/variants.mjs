const addVariants = () => {
    showPopup();     
};

const showPopup = () => {
    /*
    const popup = document.createElement('div');
    popup.className = 'popup';
    */
    //const selector = document.createElement('select');
    const blackout = document.getElementById('blackout');
    const popup = document.getElementById('variants-popup');
    popup.querySelector('input[name="teifile"]').addEventListener('change',getFile);
    const selector = popup.querySelector('select');
    //selector.setAttribute('name','edblock');
    for(const lg of document.querySelectorAll('.lg')) {
        if(!lg.id) continue;
        const option = document.createElement('option');
        option.value = lg.id;
        option.append(lg.id);
        selector.append(option);
    }
    popup.style.display = 'flex';
    blackout.style.display = 'flex';
    blackout.addEventListener('click',(e) => {
        const targ = e.target.closest('.popup');
        if(!targ)
            document.querySelector('#blackout').remove();
    });
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
const getFile = async () => {
    const popup = document.getElementById('variants-popup');
    const input = document.getElementById('teifile');
    const blockid = popup.querySelector('select[name="edblock"]').value;

    const file = input.files[0];
    const text = await readOne(file);
    const xml = parseString(text,file.name);
    const app = await makeApp(xml, {
        base: document.querySelector('.text-siglum').textContent,
        normlem: document.getElementById('normlem').checked, 
        mergerdgs: document.getElementById('mergerdgs').checked,
        blockid: blockid
    });

    popup.style.height = '80%';
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
    const standOff = `<standOff type="apparatus" corresp="#${blockid}">\n<listApp>\n${app}\n</listApp>\n</standOff>`;
    output.innerHTML = Prism.highlight(standOff, Prism.languages.xml, 'xml');

    copyToClipboard(standOff,popup);
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
const mergeGroups = (doc) => {
    const els = doc.querySelectorAll('cl');
    for(const el of els) {
        const firstw = el.removeChild(el.firstChild);
        while(el.firstChild) {
            const norm1 = firstw.getAttribute('lemma') || firstw.textContent;
            const norm2 = el.firstChild.getAttribute('lemma') || el.firstChild.textContent;
            firstw.setAttribute('lemma',norm1 + norm2);
            while(el.firstChild.firstChild)
                firstw.appendChild(el.firstChild.firstChild);
            el.firstChild.remove();
        }
        if(firstw.getAttribute('lemma') === firstw.textContent)
            firstw.removeAttribute('lemma');
        el.parentNode.insertBefore(firstw,el);
        el.parentNode.removeChild(el);
    }
};

const getWitList = (doc, arr) => {
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

    return `wit="${[...newwits].map(w => '#' + w).join(' ')}"`;
};

const curry = f => {
    return a => {
        return b => {
            return f(a,b);
        };
    };
};

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

const makeApp = async (doc, opts) =>  {
    if(opts.mergerdgs) mergeGroups(doc);

    const curriedWitList = curry(getWitList)(doc);
    
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

    return ret + new XMLSerializer().serializeToString(doc.querySelector('listWit'));
};

export { addVariants };
