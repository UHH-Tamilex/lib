import alignApparatus from './apparatus-eva.mjs';
import { makeApp, addWitnesses, addApparatus, getWits } from './apparatus.mjs';
import { loadDoc, saveAs } from './utils.mjs';

const cachedAlignments = new Map();

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

    document.getElementById('usefoundfile').addEventListener('click',() => {
        const name = document.getElementById('foundfile').textContent;
        getFile({alignment: {text: cachedAlignments.get(name)}, name: name});     
    });

    document.getElementById('variantsswitcher').addEventListener('click',switchType);
    document.getElementById('addapparatus').addEventListener('click',generateApp);
    document.getElementById('saveapparatus').addEventListener('click',saveAs.bind(null,Apparatuser.sharedState.filename, Apparatuser.sharedState.curDoc));
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
    const res = await fetch(srcname,{cache: 'no-cache'});
    if(!res.ok) {
        filefinder.style.display = 'none';
        popup.querySelector('label[for="teifile"]').textContent = 'Select alignment file...';
        return;
    }
    const xmltext = await res.text();
    
    cachedAlignments.set(srcname, xmltext);

    document.getElementById('foundfile').textContent = srcname;
    filefinder.style.display = 'block';
    popup.querySelector('label[for="teifile"]').textContent = 'Use a different file...';
};

const generateApp = async e => {

    const popup = document.getElementById('variants-popup');
    const blockid = popup.querySelector('select[name="edblock"]').value;
    const listApp = await alignApparatus(Apparatuser.sharedState.curDoc, blockid);


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
        let curStandOff = Apparatuser.sharedState.curDoc.querySelector(`standOff[type="apparatus"][corresp="#${blockid}"]`);
        if(!curStandOff) {
            curStandOff = Apparatuser.sharedState.curDoc.createElementNS('http://www.tei-c.org/ns/1.0','standOff');
            curStandOff.setAttribute('corresp',`#${blockid}`);
            curStandOff.setAttribute('type','apparatus');
        }
        Apparatuser.sharedState.curDoc.documentElement.appendChild(curStandOff);
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

    const xml = alignment ?
        parseString(alignment.text) :
        await (async () => {
            const input = document.getElementById('teifile');
            const file = input.files[0];
            const text = await readOne(file);
            return parseString(text,file.name);
        })();
    
    const cachedwitnesses = new Map();
    const cachedfiles = new Map();
    for(const wit of getWits(Apparatuser.sharedState.curDoc,xml)) {
        if(!cachedwitnesses.get(wit.name)) {
            let file = cachedfiles.get(wit.filename);
            if(!file) {
                file = await loadDoc(wit.filename);
                cachedfiles.set(wit.filename,file);
            }
            if(file) { // file could be null from loadDoc
                cachedwitnesses.set(wit.name, {
                    name: wit.name,
                    type: wit.type,
                    select: wit.select,
                    xml: file
                });
            }
        }
    }
    const app = await makeApp(xml, Apparatuser.sharedState.curDoc, {
        base: document.querySelector('.text-siglum').textContent,
        normlem: document.getElementById('normlem').checked, 
        mergerdgs: document.getElementById('mergerdgs').checked,
        blockid: blockid,
        witnesses: cachedwitnesses
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
    
    addWitnesses(Apparatuser.sharedState.curDoc, app.listwit);
    addApparatus(Apparatuser.sharedState.curDoc, app.listapp, xml, blockid, e.name);
    const curStandOff = Apparatuser.sharedState.curDoc.querySelector(`standOff[type="apparatus"][corresp="#${blockid}"]`);
    /*
    if(!curStandOff) {
        curStandOff = newDoc.createElementNS('http://www.tei-c.org/ns/1.0','standOff');
        curStandOff.setAttribute('corresp',`#${blockid}`);
        curStandOff.setAttribute('type','apparatus');
    }

    if(alignment)
        curStandOff.setAttribute('source',alignment.filename);
    curStandOff.innerHTML = app;

    newDoc.documentElement.appendChild(curStandOff);
    */
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

const getWitOrder = el => {
    return [...el.querySelectorAll('witness')].map(w => w.getAttribute('xml:id'));
};

const Apparatuser = {
    addVariants: addVariants,
    sharedState: null
};
export default Apparatuser;
