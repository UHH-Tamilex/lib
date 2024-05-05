import { Sanscript } from '../js/sanscript.mjs';

const filename = window.location.pathname.split('/').pop();
var curDoc = null;

const alignApparatus = async (doc) => {
    if(!curDoc) await loadDoc();
    const popup = document.getElementById('variants-popup');

    const blockid = popup.querySelector('select').value;
    const textblock = curDoc.querySelector(`[*|id="${blockid}"]`);
    const edition = textblock.querySelector('[type="edition"]');
    let text = edition || textblock;
    const textarea = popup.querySelector('textarea');
    const app = processApparatus(textarea.value);
    const aligned = alignAppToText(app,text);
    const formatted = formatApparatus(aligned,blockid);
    console.log(formatted);
    /*
     * const adjusted = adjustApparatus(aligned,eddoc);
     * const formatted = formatApparatus(adjusted);
    */
    //return formatted;
};

const formatApparatus = (entries,blockid) => {
    const formatted = entries.map(entry => {
        const notes = (entry.notes && entry.notes.length !== 0) ? entry.notes.map(n => `<note xml:lang="en">${n.innerHTML}</note>`).join('\n') : '';
        if(!entry.coords)
            return `<app>${notes}</app>`;
        const readings = entry.readings.map(rdg => {
            return `<rdg wit="${rdg.witnesses.join(' ')}">${rdg.reading}</rdg>`;
        });
        return `<app corresp="${entry.coords[0]},${entry.coords[1]}">
        <lem wit="${entry.lemma.witnesses.join(' ')}">${entry.lemma.reading}</lem>
        ${readings.join('\n')}${notes}
        </app>`;
    });
    return `<standOff type="apparatus" corresp="#${blockid}">\n<listApp>\n${formatted.join('\n')}\n</listApp>\n</standOff>`;
};

const alignAppToText = (app,text) => {
    const edlines = [...text.querySelectorAll('l')].map(l => {
        const clone = l.cloneNode(true);
        const choices = clone.querySelectorAll('choice');
        for(const choice of choices) {
            const first = choice.firstChild;
            while(first.nextSibling) first.nextSibling.remove();
        }
        return clone.textContent.replaceAll(/\s/g,'');
    });
    const ret = [];
    for(const entry of app) {
        if(!entry.line) {
            ret.push({notes: entry.notes});
            continue;
        }
        const charsbefore = edlines.slice(0,entry.line-1).join('').length;
        const prepend = charsbefore || 0;
        const searchfrom = edlines.slice(entry.line-1).join('');
        const stripped = entry.lemma.reading.replaceAll(/\s/g,'').replaceAll(/<[^>]+>/g,''); // ugly removal of tags
        const start = searchfrom.indexOf(stripped);
        if(start === -1) console.log(`warning: lemma "${stripped}" not found`);
        const end = start + stripped.length;
        /*
        if(start === -1) { // maybe it spans two cirs and there's a <choice>
            const split = entry.lemma.reading.split(' ');
            const last = split.pop();
            start = searchfrom.indexOf(split[0]);
            end = searchfrom.indexOf(last) + last.length;
        }
        */
        const coords = [prepend + start, prepend + end];
        ret.push({coords: coords, lemma: entry.lemma, readings: entry.readings, notes: entry.notes});
    }
    return ret;
};

const loadDoc = async () => {
    const res = await fetch(filename);
    const xmltext = await res.text();
    curDoc = (new DOMParser()).parseFromString(xmltext,'text/xml');
};

const processApparatus = (str) => {
    const apparatus = str.trim().split(/[Ɛ#•$]/).map(l => {
        if(l === '') return null;

        const clean = l.trim();
        const placeres = /^(\d+-?)([a-z\-]+)/.exec(clean);
        if(!placeres) {
            const note = curDoc.createElementNS('http://www.tei-c.org/ns/1.0','note');
            note.append(clean.replace(/[\[\]]/g,''));
            return {notes: [note]};
        }

        const line = placeres[1];
        const cirs = placeres[2];

        const entries = clean.split(';').map(e => {
            const witstart = e.split('').reverse().join('').match(/[\u0b80-\u0bff_><‡\[\]]/);
            const rdg = formatReading(e.slice(0,`-${witstart.index}`));
            const wits = splitWitnesses(e.slice(`-${witstart.index}`));
            return {reading: Sanscript.t(rdg,'tamil','iast'), witnesses: wits};
        });
        return {line: line, cirs: cirs, lemma: entries.shift(), readings: entries};
    });
    return apparatus.filter(l => l);
};

const splitWitnesses = (str) => {
    const wits = str.split(',').reduce((acc,cur) => {
        const split = cur.trim().split('+');
        if(split.length === 1) {
            acc.push(split[0]);
            return acc;
        }
        const initial = split[0].match(/^[^\d]+(?=[\d(])/)[0];
        const newsplit = split.map((el,i) => {
            if(i === 0) return el.replace(/^\(/,'');
            else return initial + el;
        });
        return acc.concat(newsplit);
    },[]);
    const witsclean = wits.map(w => {
        const clean = w.replace(/[.\s\[\]()]/g,'');
        return `#${clean}`;
    });
    return witsclean;
};

const formatReading = (str) => {
     return str.replace(/^[\da-f\-•#$Ɛ.]+/,'')
         .replace(/\s*\|\s*/,'\n')
         .trim()
         .replace(/‡+/g,(match) => `<gap reason="lost" quantity="${match.length}" unit="character"/>`)
         .replace(/<sic>(_+)<\/sic>/g,(match,p1) => `<space quantity="${p1.length}" unit="character"/>`)
         .replace(/\[/g,'<sic>').replace(/\]/g,'</sic>');
};

export default alignApparatus;
