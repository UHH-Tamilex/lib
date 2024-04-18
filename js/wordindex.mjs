import { Transliterate } from '../lib/js/transliterate.mjs';
import createSqlWorker from './sqlWorker.mjs';

const init = () => {
    const loc = window.location.hash;
    if(!loc) return;

    const word = decodeURI(loc.replace(/^#/,''));
    const details = document.querySelector(`details[data-entry='${word}']`);
    const pardetails = details.parentNode.closest('details');
    if(pardetails) {
        docClick({target: pardetails});
        pardetails.open = true;
    }
    docClick({target: details});
    details.scrollIntoView({behavior: 'smooth', block: 'center'});
    details.open = true;
};

const formatCitations = (citations) => {
    return citations.map(c =>
        `<div><span class="msid" lang="en"><a href="../${c.filename}">${c.siglum}</a></span> <q lang="ta">${c.context}</q></div>`).join('\n');
};

const docClick = e => {
    const details = e.target.closest('details');
    if(details) getEntry(details);
};

const workers = {
    local: null,
    full: null
};

const getEntry = async (targ) => {
    const spinner = targ.querySelector(':scope > .spinner');
    if(!spinner) return;
    
    if(!workers.local) 
        workers.local = await createSqlWorker('../../wordindex.db');
    if(!workers.full) 
        workers.full = await createSqlWorker('index.db');
    let results;
    if(targ.id) {
        results = await workers.local.db.query('SELECT def, type, number, gender, nouncase, person, aspect, mood, proclitic, enclitic, context, citation, filename FROM dictionary WHERE islemma = ?',[targ.id]);
        if(results.length === 0)
            results = await workers.full.db.query('SELECT definition, type, number, gender, nouncase, person, aspect, mood FROM dictionary WHERE islemma = ?',[targ.id]);
    }
    else {
        const lemma = targ.closest('details[id]')?.id;
        const form = targ.closest('details').dataset.entry;
        if(lemma)
            results = await workers.local.db.query('SELECT def, type, number, gender, nouncase, person, aspect, mood, proclitic, enclitic, context, citation, filename FROM dictionary WHERE form = ? AND fromlemma = ?',[form,lemma]);
        else
            results = await workers.local.db.query('SELECT def, type, number, gender, nouncase, person, aspect, mood, proclitic, enclitic, context, citation, filename FROM dictionary WHERE form = ? AND fromlemma IS NULL',[form]);
    }
    
    const entry = {
        translations: new Set(),
        grammar: new Set(),
        citations: []
    };

    for(const result of results) {
        if(result.def) entry.translations.add(result.def);
        if(result.definition) entry.definition = result.definition;
        if(result.type) entry.grammar.add(result.type);
        if(result.number) entry.grammar.add(result.number);
        if(result.gender) entry.grammar.add(result.gender);
        if(result.nouncase) entry.grammar.add(result.nouncase);
        if(result.person) entry.grammar.add(result.person);
        if(result.aspect) entry.grammar.add(result.aspect);
        if(result.mood) entry.grammar.add(result.mood);
        if(result.citation) entry.citations.push({
            siglum: result.citation,
            filename: result.filename,
            context: result.context
        });
    }
    const definition = entry.definition ? `<div>${entry.definition}</div>` : '';
    let frag =
`<div lang="en">
<div>${[...entry.grammar].join(', ')}</div>
${definition}
</div>`;
    if(entry.translations.size > 0) {
        frag = frag + 
`<div>
<h4 lang="en">translations in context</h4>
<div class="dict-definitions">${[...entry.translations].join(', ')}</div>`;
    }
    if(entry.citations.length > 0) {
        frag = frag + 
`<h4 lang="en">citations</h4>
<div class="dict-citations">
${formatCitations(entry.citations)}
</div>`;
    }
    const range = document.createRange();
    range.selectNode(targ);
    const docfrag = range.createContextualFragment(frag);
    spinner.replaceWith(docfrag);
};

document.addEventListener('click',docClick);
window.addEventListener('load',init);
