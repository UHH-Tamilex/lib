const makeWordsplits = standOff => {
    const words = [];
    for(const child of standOff.children) {
        if(child.nodeName === 'entry')
            words.push(processEntry(child));
        else if(child.nodeName === 'superEntry')
            words.push(processSuperEntry(child));
    }

    const tamsplits = [];
    const engsplits = [];
    const allnotes = [];
    const serializer = new XMLSerializer();
    for(const word of words) {
        if(word.hasOwnProperty('strands')) {
            tamsplits.push(word.strands.map(arr => arr.map(w => w.tamil).join('|')).join('/'));
            engsplits.push(word.strands.map(arr => arr.map(w => w.note ? w.english + '*' : w.english).join('|')).join('/'));
            for(const strand of word.strands)
                for(const w of strand) 
                    if(w.note) allnotes.push(serializer.serializeToString(w.note));
        }
        else {
            tamsplits.push(word.tamil);
            engsplits.push(word.note ? word.english + '*' : word.english);
            if(word.note) allnotes.push(serializer.serializeToString(word.note));
        }
    }
    const doc = standOff.ownerDocument;
    const selected = standOff.getAttribute('corresp').slice(1);
    const lines = [...doc.querySelectorAll(`[*|id="${selected}"] [type="edition"] l`)];
    const linecounts = countLines(lines);
    
    const alignmentel = standOff.querySelector('interp[select="0"]');
    const alignment = alignmentel.textContent.trim().split(',').map(s => decodeRLE(s));

    const realcounts = matchCounts(alignment,linecounts);
    let tamout = '';
    let engout = '';
    let wordcount = 0;
    for(let n=0; n<tamsplits.length;n++) {
        wordcount = wordcount + firstOption(tamsplits[n]).length;
        if(wordcount >= realcounts[0]) {
            tamout = tamout + tamsplits[n] + '\n';
            engout = engout + engsplits[n] + '\n';
            realcounts.shift();
        }
        else {
            tamout = tamout + tamsplits[n] + ' ';
            engout = engout + engsplits[n] + ' ';
        }
    }

    return {eng: engout, tam: tamout, notes: allnotes};
};

const processEntry = (entry) => {
    const def = entry.querySelector('def');
    const grammar = getGrammar(entry);
    return {
        tamil: retransformWord(entry.querySelector('form')),
        english: def ? def.textContent.trim().replaceAll(/\s+/g,'_') + grammar : 
                       grammar || '()',
        note: entry.querySelector('note')
   };
};
const processSuperEntry = (superEntry) => {
    const ret = {
            type: superEntry.getAttribute('type'),
            strands: []
        };
    for(const strand of superEntry.querySelectorAll(':scope > entry')) {
        const strandentries = [];
        for(const entry of strand.querySelectorAll(':scope > entry')) {
            strandentries.push(processEntry(entry));
        }
        ret.strands.push(strandentries);
    }
    return ret;
};

const getGrammar = (entry) => {
    const ret = [];
    for(const gram of entry.querySelectorAll('gram[type="role"]'))
        ret.push(reverseAbbreviations.get(gram.textContent));
    return ret.length > 0 ? '(' + ret.join('|') + ')' : '';
};
const retransformWord = el => {
    const clone = el.cloneNode(true);
    const chars = clone.querySelectorAll('c');
    for(const c of chars) {
        const type = c.getAttribute('type');
        switch (type) {
            case 'elided':
                c.replaceWith('*');
                break;
            case 'geminated':
                c.replaceWith('+');
                break;
            case 'glide':
                c.replaceWith('~');
                break;
            case 'uncertain':
                c.replaceWith(`(${c.textContent})`);
                break;
            case 'inserted':
                c.replaceWith(`[${c.textContent}]`);
                break;
        }
    }
    return getEditionText(clone).trim().replaceAll(/\(u\)/g,'*');
};

const getEditionText = el => {
    const clone = el.cloneNode(true);
    for(const gap of clone.querySelectorAll('gap')) {
        const quantity = gap.getAttribute('quantity') || 1;
        gap.replaceWith('‡'.repeat(quantity));
    }
    return clone.textContent;
};

const reverseAbbreviations = new Map(
    gramAbbreviations.map(arr => [arr[1],arr[0]])
);
export {makeWordsplits, getEditionText};
