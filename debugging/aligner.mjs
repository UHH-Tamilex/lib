import needlemanWunsch from './needlemanwunsch.mjs';
import dbQuery from './dbquery.mjs';
import createSqlWorker from '../js/sqlWorker.mjs';

const CONCATRIGHT = Symbol.for('concatright');
const CONCATLEFT = Symbol.for('concatleft');

const particlebare = ['amma','amma-','attai','arō','ā','ār','āl','ālamma','āṟṟilla','ikā','um','umār','ē','ēku','ēkamma','ēmaṉṟa','ō','ōo','ōteyya','kol','kollō','kollē','koṉ','koṉmaṟṟu','koṉ-','til','tilla','tillamma','teyya','maṟṟu','maṟṟu-','maṟṟē','ōmaṟṟē','maṟṟilla','maṉ','maṉṟa','maṉṟilla','maṉṉō','maṉṉē','maṉṉum','maṉṉāl','maṉṟa','maṉṟamma','maṟkollō','mātu','mātō','māḷa','yāḻa','yāḻa-'];

particlebare.sort((a,b) => b.length - a.length);

const particles = particlebare.map(a => {
    if(a.endsWith('-')) {
        const aa = a.slice(0,-1);
        if(/u$/.test(aa)) {
            const regex = aa.replace(/u$/,'(?:[*\'’u]|\\(i\\))');
            return [a,new RegExp(`^\\+?~?${regex}\\+?-`)];
        }
        else
            return [a,new RegExp(`^\\+?~?${aa}\\+?-`)];
    }
    if(/u$/.test(a)) {
        const regex = a.replace(/u$/,'(?:[*\'’u]|\\(i\\))');
        return [a,new RegExp(`\\+?~?${regex}\\+?$`)];
    }
    else
        return [a,new RegExp(`\\+?~?${a}\\+?$`)];
});

const caseAffixes = [
/*
    ['māṭṭu',{
        regex: /māṭṭ[*’u]$/,
        gram: 'locative',
        translationregex: /\(loc\.\)$/
    }],
    ['mutal',{
        regex: /mutal\+?$/,
        gram: 'locative',
        translationregex: /\(loc\.\)$/
    }],
    ['kaṇ',{
        regex: /kaṇ\+?$/,
        gram: 'locative',
        translatonregex: /\(loc.\.\)$/
    }],
    */
    ['iṉ',{
        regex: /iṉ\+?$/,
        gram: 'oblique',
        translationregex: /iṉ$/
    }],
    ['iṉum',{
        regex: /~?iṉum\+?$/,
        translationregex: /iṉum$/
    }],
    ['am',{
        regex: /~?am\+?$/,
        translationregex: /am$/
    }],
    ['a',{
        regex: /~?a\+?$/,
        translationregex: /a$/
    }],
    ['oṭu',{
        regex: /~?[oō]ṭ[u’*]\+?$/,
        gram: 'sociative',
        translationregex: /-with$/
    }],
    ['āṅku',{
        regex: /~?[aā]ṅk[u’*]\+?$/,
        gram: 'comparative',
        translationregex: /-like$/
    }]
];
caseAffixes.sort((a,b) => b[0].length - a[0].length);

const gramAbbreviations = [
    ['abl.','ablative'],
    ['abs.','absolutive'],
    ['acc.','accusative'],
    ['adj.','adjective'],
    ['adv.','adverb'],
    ['caus.','causative'],
    ['conc.','concessive'],
    ['cond.','conditional'],
    ['comp.','comparative'],
    ['dat.','dative'],
    ['den.','denominative'],
    ['f.','feminine'],
    ['f.sg.','feminine singular'],
    ['f.pl.','feminine plural'],
    ['f.v.','finite verb'],
    ['gen.','genitive'],
    ['h.','honorific'],
    ['1.','first person'],
    ['2.','second person'],
    ['3.','third person'],
    ['hab.fut.','habitual future'],
    ['i.a.','imperfect aspect'],
    ['id.','ideophone'],
    ['inf.','infinitive'],
    ['inst.','instrumental'],
    ['inter.pron.','interrogative pronoun'],
    ['ipt.','imperative'],
    ['loc.','locative'],
    ['m.','masculine'],
    ['m.sg.','masculine singular'],
    ['m.pl.','masculine singular'],
    ['muṟ.','muṟṟeccam'],
    ['n.','noun'],
    ['n.sg.','neuter singular'],
    ['n.pl.','neuter plural'],
    ['neg.','negative'],
    ['obl.','oblique'],
    ['opt.','optative'],
    ['p.a.','perfective aspect'],
    ['p.n.','proper name'],
    ['part.n.','participial noun'],
    ['pey.','peyareccam'],
    ['pl.','plural'],
    ['post.','postposition'],
    ['sub.','subjunctive'],
    ['pron.','pronoun'],
    ['pron.n.','pronominalised noun'],
    ['r.n.','root noun'],
    ['sg.','singular'],
    ['soc.','sociative'],
    ['suff.','suffix'],
    ['v.n.','verbal noun'],
    ['v.r.','verbal root'],
    ['v.r.adj.','verbal root as adjective'],
    ['v.r.ger.','verbal root as gerundive'],
    ['v.r.ipt.','verbal root as imperative'],
    ['v.r.inf.','verbal root as infinitive'],
    ['v.r.pey.','verbal root as peyareccam'],
    ['v.r.pey.p.a.','verbal root as peyareccam perfective aspect'],
    ['v.r.pey.i.a.','verbal root as peyareccam imperfective aspect'],
    ['voc.','vocative']
];

gramAbbreviations.sort((a,b) => b[0].length - a[0].length);

const gramKeys = gramAbbreviations.map(a => a[0]);

const gramMap = new Map(gramAbbreviations);

const wordsplitscore = (a,b) => {
    const vowels = 'aāiīuūoōeē'.split('');
    if(a === ' ' || b === ' ') return -2;
    if(a === b) return 1;
    if(['-','*','\'','’','(',')'].includes(b)) return -2;
    if(['y','v'].includes(a) && b === '~') return 1; // is this needed?
    if(vowels.includes(a) && vowels.includes(b)) return -0.5;
    return -1;
};
/*
const warnTypos = (alignment) => {
    const ret = [];
    alignment[1].forEach((el, i) => {
        if(el === '') {
            const slice0 = alignment[0].slice(i-10,i+10).join('');
            const slice1 = alignment[1].slice(i-10,i).join('') + 
                '<mark>&nbsp;</mark>' +
                alignment[1].slice(i,i+10).join('');
            ret.push(`Missing sandhi: <span class="choice"><span>${slice0}</span><span>${slice1}</span></span>`);
        }
        else if(el === '~' && !['v','y'].includes(alignment[0][i])) {
                const slice0 = alignment[0].slice(i-10,i+10).join('');
                const slice1 = alignment[1].slice(i-10,i).join('') +
                    `<mark>${el}</mark>` + 
                    alignment[1].slice(i+1,i+10).join('');
                ret.push(`Unmatched sandhi: <span class="choice"><span>${slice0}</span><span>${slice1}</span></span>`);
        }
        else if(el === '+' && alignment[0][i] === '') {
                const slice = alignment[1].slice(i-10,i).join('') +
                    `<mark>${el}</mark>` + 
                    alignment[1].slice(i+1,i+10).join('');
                ret.push(`Unmatched sandhi: ${slice}`);
        }
    });
    return ret;
};
*/
const removeOptions = (words) => words.map(w => w.split('/')[0].replaceAll('|',''));

const tamilSplit = (str) => {
    const ret = [];
    const ugh = new Set(['i','u']);
    for(let n=0;n<str.length;n++) {
        if(ugh.has(str[n]) && ret[ret.length-1] === 'a')
                ret[ret.length-1] = 'a' + str[n];
        /*
        else if(str[n] === '(' && str[n+1] === 'm' && str[n+2] == ')') {
            ret.push('(m)');
            n = n+2;
        }
        */
        else
            ret.push(str[n]);
    }
    return ret;
};

const alignWordsplits = async (text,tam,eng,notes,lookup=false) => {
    /*
    if(tam.length !== eng.length) {
        return {xml: null, warnings: ['Tamil and English don\'t match.']};
    }
    */
    //const wl = restoreSandhi(removeOptions(tam).join(''));
    const wl = removeOptions(tam);
    const wordjoin = tamilSplit(wl.join(''));
    const aligned = needlemanWunsch(tamilSplit(text),wordjoin,wordsplitscore);
    ///const warnings = warnTypos(aligned);
    const realigned = jiggleAlignment(aligned,wl);
    
    const wordlist = tam.map((e,i) => {
        // TODO: should we remove hyphens or not?
        //return {word: e, translation: cleanupTranslation(eng[i])};
        return {word: e, translation: eng[i]};
    });
    
    const warnings = await cleanupWordlist(wordlist,notes,lookup);

    const entries = makeEntries(wordlist);
    const rle = formatAlignment(realigned,0);

    const ret = {xml: rle + '\n' + entries.join('\n'), alignment: aligned, warnings: warnings};
    if(lookup)
        ret.wordlist = wordlist;
    return ret;
};
/*
const cleanupTranslation = (str) => {
    return str.replace(/-(?=\w)/g, ' ');
};
*/
//const restoreSandhi = (s) => {
//    return s/*.replace(/[mṉ]$/,'x')*/ // need to share
//            .replaceAll(/([iīeē])~/g,'$1y')
//            .replaceAll(/([aāuūoō])~/g,'$1v')
//            .replaceAll(/[\[\]]/g,'');
//};

const formatAlignment = (arr) => {
    const getChar = s => {
            if(s === '') return 'G';
            else if(s === CONCATRIGHT) return 'R';
            else if(s === CONCATLEFT) return 'L';
            else return 'M';
    };
    let a0 = '';
    let a1 = '';
    for(let n=0;n<arr[0].length;n++) {
        const arr0len = arr[0][n].length;
        const arr1len = arr[1][n].length;
        //TODO: more general solution for longer elements?
        if(arr0len === 2) {
            a0 = a0 + 'MM';
            if(arr1len === 2)
                a1 = a1 + 'MM';
            else
                a1 = getChar(arr[1][n]) + 'G';
        }
        else if(arr1len === 2) {
            a1 = a1 + 'MM';
            a0 = getChar(arr[0][n]) + 'G';
        }
        else {
            a0 = a0 + getChar(arr[0][n]);
            a1 = a1 + getChar(arr[1][n]);
        }
    }
    const flatarrs = [a0,a1].map(a => a.replaceAll(/([GRLM])\1+/g,(match, chr) => match.length + chr));
    return `<interp type="alignment" select="0">${flatarrs[0]},${flatarrs[1]}</interp>`;
};

const makeEntries = (arr) => {
    const formatWord = (w) => {
        return w.replace(/([~+()])/g,'<pc>$1</pc>')
                //.replace(/['’*]$/,'<pc type="ignored">(</pc>u<pc type="ignored">)</pc>')
                .replaceAll(/['’*]/g,'<pc type="ignored">(</pc>u<pc type="ignored">)</pc>')
                .replaceAll(/\[(.+?)\]/g,'<supplied>$1</supplied>');
                //.replaceAll(/\[(.+?)\]/g,'$1');
    };

    const formatEntry = (e) => {
        const bare = e.bare ? `<form type="simple">${e.bare}</form>\n` : '';
        const affixrole = e.affixrole ? `<gramGrp><gram type="role">${e.affixrole}</gram></gramGrp>` : '';
        const affix = e.affix ? `<gramGrp type="affix"><m>${e.affix}</m>${affixrole}</gramGrp>\n` : '';
        const gram = e.gram ? '<gramGrp>' + 
                    e.gram.map(g => `<gram type="role">${gramMap.get(g)}</gram>\n`).join('') +
                    '</gramGrp>'
                : '';
        const particle = e.particle ? `<gramGrp type="particle"><m>${e.particle}</m></gramGrp>\n` : '';
        //return `<entry>\n<form>${formatWord(e.word)}</form>\n<def>${e.translation.replaceAll(/_/g,' ')}</def>\n${bare}${affix}${gram}${particle}${e.wordnote ? formatNote(e.wordnote) : ''}${e.transnote ? formatNote(e.transnote) : ''}</entry>`;
        return `<entry>\n<form>${formatWord(e.word)}</form>\n<def>${e.translation.replaceAll(/_/g,' ')}</def>\n${bare}${affix}${gram}${particle}${e.wordnote ? '\n' + e.wordnote : ''}</entry>`;
    };

    return arr.map(obj => {
        /*
        const wordsplit = obj.word.split('/');
        if(wordsplit.length > 1) {
            const transsplit = obj.translation.split('/');
            const newobj = [];
            for(let n=0;n<wordsplit.length;n++)
                newobj.push({word: wordsplit[n], translation: transsplit[n]});
            const formatted = newobj.map(f => `<entry>\n${formatEntry(f)}\n</entry>`).join('');
        */
        if(obj.superEntry) {
            const formatted = obj.superEntry.map(o => o.map(oo => formatEntry(oo)).join(''))
                                            .map(e => `<entry>${e}</entry>`)
                                            .join('\n');
            return `<superEntry type="ambiguous">\n${formatted}\n</superEntry>`;
        }
        else
            return formatEntry(obj);
    });
};

const cleanBare = (str) => {
    //str = str.replaceAll(/[~+-.]/g,'').replace(/['’*]$/,'u');
    str = str.replaceAll(/[\[\]~+.]/g,'').replace(/-$|^-/,'').replaceAll(/['’*]/g,'u');
    /*
    if(str.match(/[iīeē]y$/))
        return str.slice(0,-1); // inserted glide
    if(str.match(/[aāuūoō]v$/))
        return str.slice(0,-1); // inserted glide; but what if it's vu?
    if(str.match(/[kcṭtpvṟ]$|ṉṉ$/))
        return str + 'u'; // probably elided overshort u
    if(str.match(/mm$/))
        return str.slice(0,-1); // probably geminated m (uyiram + ē -> uyirammē)
    */
    return str;
};

const findHyphen = (str, index,affix) => {
    if(affix.endsWith('-')) {
        return true;
    }
    for(let i=index-1;i>0;i--) {
        if(str[i] === '-') return i;
        if(['~','+'].includes(str[i])) continue;
        return false;
    }
    return false;
};

const findParticle = (word,translation) => {
    for(const [particle,regex] of particles) {
        const cleanword = word.replaceAll(/[\[\]]/g,'');
        const wordmatch = cleanword.match(regex);
        const transmatch = translation.match(regex);
        if(wordmatch) {
            if(transmatch)
                return {
                    //translation: translation.slice(0,translation.length-transmatch[0].length),
                    translation: translation.replace(regex,''),
                    particle: cleanBare(particle),
                    //bare: cleanBare(cleanword.slice(0,cleanword.length-wordmatch[0].length))
                    bare: cleanBare(cleanword.replace(regex,''))
                };
            else {
                const hyphen = findHyphen(cleanword,wordmatch.index,particle);
                if(hyphen)
                    return {
                        translation: translation,
                        particle: cleanBare(particle),
                        bare: cleanBare(cleanword.replace(regex,''))
                    };
            }
        }
    }
    return null;
};

const findAffix = (word,translation) => {
    for(const [affix,obj] of caseAffixes) {
        const wordmatch = word.match(obj.regex);
        const transmatch = translation.match(obj.translationregex);
        if(wordmatch && transmatch) {
            const ret = {
                translation: translation.slice(0,translation.length-transmatch[0].length),
                affix: affix,
                // don't clip affix for case affixes; the declined form goes into the dictionary
            };
            if(obj.gram) ret.gram = obj.gram;
            return ret;
        }
    }
};

const findGrammar = (translation) => {
    const gram = translation.search(/\(.+\)-?$/);
    if(gram == -1) return null;

    const hyphen = translation.endsWith('-') ? '-' : '';
    const trimmed = translation.slice(0,gram) + hyphen;

    let hay = translation.slice(gram).replaceAll(/[\(\)\-]/g,'');
    
    const ret = [];
    let hayswarning = false;
    const hays = hay.split('|');
    if(hays.length > 1) {
        hayswarning = -1;
        for(const hh of hays) {
            let h = hh;
            for(const abbr of gramKeys) {
                const found = h.indexOf(abbr);
                if(found === -1) continue;
                
                h = h.slice(0,found) + h.slice(found + abbr.length);
                ret.push(abbr);
            }
            if(h.trim() !== '')
                hayswarning = true;
        }
    }
    else {
        for(const abbr of gramKeys) {
            const found = hay.indexOf(abbr);
            if(found === -1) continue;
            
            hay = hay.slice(0,found) + hay.slice(found + abbr.length);
            ret.push(abbr);
        }
    }

    const rett = {
        translation: trimmed,
        gram: ret
    };
    if(hayswarning === true) {
        const warning = translation.slice(gram);
        rett.warning = warning;
        rett.translation = rett.translation + warning;
    }
    else if(hayswarning === false && hay.trim() !== '') {
        const warning = translation.slice(gram);
        rett.warning = warning;
        rett.translation = rett.translation + warning;
    }
    return rett;

    /*
    for(const [affix,gram] of gramAbbreviations) {
       if(translation.endsWith(affix))
            return {
                translation: translation.slice(0,translation.length-affix.length),
                gram:  gram
            };
       else if(translation.endsWith(affix + '-'))
            return {
                translation: translation.slice(0,translation.length-affix.length-1) + '-',
                gram:  gram
            };
    }
    return null;
    */
};

const mostPopular = (arr) => {
    const ret = {
        el: null,
        max: 0
    };
    for(const a of arr) {
        const len = a[1].length;
        if(len > ret.max) {
            ret.el = a;
            ret.max = len;
        }
    }
    return ret.el;
};

const lookupFeatures = async (str) => {
    const res = await dbQuery(str);
    if(!res) return null;
    
    const arr = res.length === 1 ? JSON.parse(res[0][0]) : JSON.parse(mostPopular(res)[0]);
    if(arr.length === 0) return null;

    const ret = [];
    for(const abbr of arr) {
        if(gramMap.has(abbr)) ret.push(abbr);
    }
    return ret;
};

const cleanForm =  (str) => {
    return str.replaceAll(/([~+()])/g,'')
              .replaceAll(/['’*]/g,'u');
};

const cleanupWordlist = async (list,notes,lookup) => {
    const warnings = [];
    const notescopy = [...notes];
    const worker = lookup ? await createSqlWorker('https://uhh-tamilex.github.io/lexicon/wordindex.db') : null;
    const cleanupWord = async (obj) => {
        // we should remove punctuation from the wordlist so it aligns properly
        //obj.word = obj.word.replace(/[\.;]$/,'');
        //obj.translation = obj.translation.replace(/[\.;]$/,'');
        // BUT now punctuation is removed from the wordsplit completely
        
        if(obj.translation.endsWith('*')) {
            obj.translation = obj.translation.slice(0,-1);
            if(notescopy) obj.wordnote = notescopy.shift();
        }
        if(obj.translation === '()') 
                obj.translation = '';

        const particle = findParticle(obj.word,obj.translation);
        if(particle) {
            //console.log(`Found particle: ${particle.particle} in ${obj.word}, "${obj.translation}".`);
            obj.translation = particle.translation;
            obj.particle = particle.particle;
            obj.bare = particle.bare;
        }
        const affix = findAffix(obj.bare||obj.word,obj.translation);
        if(affix) {
            //console.log(`Found affix: ${particle.affix} in ${obj.word}, "${obj.translation}".`);
            obj.translation = affix.translation;
            obj.affix = affix.affix;
            if(affix.gram) obj.affixrole = affix.gram;
        }
        const grammar = findGrammar(obj.translation);
        if(grammar) {
            //console.log(`Found grammar: ${grammar.gram} in ${obj.translation}`);
            obj.translation = grammar.translation;
            obj.gram = grammar.gram;
            if(grammar.warning) warnings.push(grammar.warning);
        }
        if(lookup) {
            const bare = cleanForm(obj.bare || obj.word);
            if(!grammar || obj.translation === '') {
                const features = await lookupFeatures(bare);
                if(features) obj.gram = features;
            }

            if(obj.translation === '') {
                const res = (await worker.db.query('SELECT def FROM citations WHERE form = ? LIMIT 1',[bare]))[0];
                if(res && res.def) obj.translation = res.def.replaceAll(/\s+/g,'_');
            }
        }
        /*
        if(!particle && !affix && !grammar) {
            const maybeParticle = obj.translation.match(/\(.+\)-?/);
            if(maybeParticle) console.log(`What about ${maybeParticle[0]} in "${obj.translation}"?`);
        }
        */
        
    };
    for(const entry of list) {
        const wordsplit = entry.word.split('/');
        if(wordsplit.length > 1) {
            const transsplit = entry.translation.split('/');
            entry.superEntry = [];
            for(let n=0;n<wordsplit.length;n++) {
                const subwords = wordsplit[n].split('|');
                const subtrans = transsplit[n].split('|');
                const strand = [];
                for(let m=0;m<subwords.length;m++) {
                    const newobj = {word: subwords[m], translation: subtrans[m]};
                    await cleanupWord(newobj);
                    strand.push(newobj);
                }
                entry.superEntry.push(strand);
            }
        }
        else
            await cleanupWord(entry);
    }
    //console.log(warnings);
    return warnings;
};

/*
const mergeWordlists = (doc, list1, list2) => {
    const newlist1 = markSegs(doc,list1,0);
    const newlist2 = markSegs(doc,list2,1);
    const merged = [...newlist1];
    
    for(const item of newlist2)
        if(item.hasOwnProperty('strand'))
            merged.push(item);
    
    merged.sort((a,b) => a.start - b.start);
    return merged;
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
const extracttext = (el, i) => {
    const clone = el.documentElement.cloneNode(true);
    const toremove = [];
    const choices = clone.querySelectorAll('choice');
    for(const choice of choices) {
        const segs = choice.querySelectorAll('seg');
        for(let n=0; n<segs.length; n++) {
            if(n !== i) toremove.push(segs[n]);
        }
    }
    for(const el of toremove) el.remove();
    return clone.textContent.replaceAll(/\s/g,'');
};
*/
const jiggleWord = (word, text, start, end) => {
    const wordend = word.at(-1);
    const wordstart = word.at(0);
    const textend = text[end-1];
    const textpostend = text[end];
    const textstart = text[start-1];
    const textprestart = text[start-2];
    if(textend === '') { // assimilated final

        if(wordend === 'm' && ['m','n'].includes(textpostend))
            //end = end + 1;
            text[end-1] = CONCATRIGHT;
        /*
        else if(wordend === '(m)' && textpostend === 'm')
            text[end-1] = CONCATRIGHT;
        */
        else if(wordend === 'l' && ['ṟ','ṉ','n'].includes(textpostend))
            //end = end + 1;
            text[end-1] = CONCATRIGHT;

        else if(wordend === 'ḷ' && ['ṭ','ṇ'].includes(textpostend))
            //end = end + 1;
            text[end-1] = CONCATRIGHT;
    }

    if(textstart === '') { // assimilated initial
        if(wordstart === 'n' && ['ṉ','ṇ'].includes(textprestart))
            //start = start - 1;
            text[start-1] = CONCATLEFT;

        else if(wordstart === 't' && ['ṭ','ṟ'].includes(textprestart))
            //start = start - 1;
            text[start-1] = CONCATLEFT;

        else if(wordstart === 'm' && textprestart === 'm')
            //start = start - 1;
            text[start-1] = CONCATLEFT;
    }
    //return [start,end];
    return text;
};

const jiggleAlignment = (aligned, wordlist) => {
    aligned = [...aligned];
    wordlist = [...wordlist];
    const words = [];
    let wordstart = 0;
    let curword = wordlist.shift().replaceAll(/[\[\]]/g,''); // AGGHHH
    let curcount = 0;
    for(let n=0; n<aligned[1].length; n++) {
        if(!curword) break; // huh?
        if(curcount === tamilSplit(curword).length) {
            aligned[0] = jiggleWord(tamilSplit(curword), aligned[0], wordstart, n);
            wordstart = n+1;
            curcount = 0;
            curword = wordlist.shift()?.replaceAll(/[\[\]]/g,''); // UGGHHHH
        }
        if(aligned[1][n] !== '')
            curcount = curcount + 1;
    }
    return aligned;
};

export { alignWordsplits, tamilSplit, gramAbbreviations };
