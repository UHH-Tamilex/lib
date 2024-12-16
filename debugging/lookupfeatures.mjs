import createSqlWorker from '../js/sqlWorker.mjs';

const _state = {
    lemmaindex: null,
    fullindex: null
};

const importantKeys = ['pos','number','gender','nouncase','person','aspect','voice'];

const lookupFeatures = async (translation, grammar) => {
    const ret = {
        translation: null,
        grammar: null
    };
    
    if(!translation && !grammar) {
        if(!state.fullindex)
            _state.fullindex = await createSqlWorker('https://uhh-tamilex.github.io/lexicon/wordindex.db');

        const res = (await _state.fullindex.db.query(`SELECT def, ${importantKeys.join(', ')} FROM [citations] WHERE form = ?`,[str]));
        const candidate = mostPopular2(res);
        ret.translation = candidate.translation.replaceAll(/\s+/g,'_');
        ret.grammar = candidate.grammar;
        return ret;
    }
    else if(!grammar) {
        if(!_state.lemmaindex) 
            _state.lemmaindex = await createSqlWorker('../debugging/index.db');

        const res = (await _state.lemmaindex.db.query(`SELECT ${importantKeys.join(', ')}, citations FROM [dictionary] WHERE word = ?`,[translation]));

        if(res) {
            const obj = res.length === 1 ? 
                res[0] :
                mostPopular(res);
            const ret = {
                translation: null,
                grammar: [],
            };
            
            ret.translation = obj.def;

            for(const key of importantKeys)
                if(obj.hasOwnProperty(key))
                    ret.grammar.push(obj[key]);

            if(ret.translation) return ret;
        }
    }
    /*
    else if(!translation) {
        if(!state.fullindex)
            _state.fullindex = await createSqlWorker('https://uhh-tamilex.github.io/lexicon/wordindex.db');
    }

    if(!ret.translation) {
        if(ret.grammar.entries.length > 0) {
            const res2 = (await _state.fullindex.db.query(`SELECT def FROM [citations] WHERE form = ?`,[str]));
        }
    }
    const res2 = (await _state.fullindex.db.query(`SELECT def, ${importantKeys.join(', ')} FROM [citations] WHERE form = ?`,[str]));
    obj.translation = res2.def.replaceAll(/\s+/g,'_');

        // lookup in fullindex
    */
};

const mostPopular = (arr) => {
    const ret = {
        el: null,
        max: 0
    };
    for(const a of arr) {
        const len = a.citations.length;
        if(len > ret.max) {
            ret.el = a;
            ret.max = len;
        }
    }
    return ret.el;
};

const mostPopular2 = (arr) => {
    if(arr.length === 1) return arr[0];

    const counts = new Map();
    for(const obj of arr) {
        const str = importantKeys.map(k => obj[k]).join(';');
        const curcount = counts.get(str);
        if(curcount) curcount.count = curcount.count + 1;
        else counts.set(str,{obj: obj,count: 1});
    }
    const sorted = [...counts.values()].toSorted((a,b) => b.count - a.count);
    return {
        translation: sorted[0][0].def,
        grammar: importantKeys.reduce((acc,cur) => {
            if(sorted[0][0].hasOwnProperty(cur))
                acc.push(cur);
            return acc;
        },[])
    };
};

export default lookupFeatures;
