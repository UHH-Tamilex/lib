const gramAbbreviations = [
    ['abl.','ablative'],
    ['abs.','absolutive'],
    ['acc.','accusative'],
    ['adj.','adjective'],
    ['adv.','adverb'],
    ['aux.','auxiliary'],
    ['caus.','causative'],
    ['conc.','concessive'],
    ['cond.','conditional'],
    ['conj.','conjunction'],
    ['comp.','comparative'],
    ['dat.','dative'],
    ['dem.pron.','demonstrative pronoun'],
    ['den.','denominative'],
    ['f.','feminine'],
    ['f.sg.','feminine singular'],
    ['f.pl.','feminine plural'],
    ['f.v.','finite verb'],
    ['gen.','genitive'],
    ['ger.','gerundive'],
    ['h.','honorific'],
    ['indef.','indefinite'],
    ['1.','first person'],
    ['2.','second person'],
    ['3.','third person'],
    ['hab.fut.','habitual future'],
    ['i.a.','imperfective aspect'],
    ['id.','ideophone'],
    ['incl.','inclusive'],
    ['inf.','infinitive'],
    ['inst.','instrumental'],
    ['inter.pron.','interrogative pronoun'],
    ['interj.','interjection'],
    ['ipt.','imperative'],
    ['loc.','locative'],
    ['m.','masculine'],
    ['m.l.','metrical lengthening'],
    ['m.sg.','masculine singular'],
    ['m.pl.','masculine plural'],
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
    ['pass.','passive'],
    ['pey.','peyareccam'],
    ['pers.pron.','personal pronoun'],
    ['pres.','present tense'],
    ['pron.','pronoun'],
    ['pl.','plural'],
    ['post.','postposition'],
    ['san.','sandhi'],
    ['sub.','subjunctive'],
    ['pron.n.','pronominalised noun'],
    ['r.n.','root noun'],
    ['rel.','relative'],
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
const gramMap = new Map(gramAbbreviations.map(arr => [arr[1],arr[0]]));

const POS = new Set(['noun',
                   'pronoun',
                   /*
                   'demonstrative pronoun',
                   'personal pronoun',
                   'interrogative pronoun',
                   */
                   'adjective',
                   'verbal noun',
                   'pronominalised noun',
                   'participial noun',
                   'verbal root',
                   'root noun',
                   'finite verb',
                   'peyareccam',
                   'infinitive',
                   'absolutive',
                   'habitual future',
                   'conditional',
                   'imperative',
                   'optative',
                   'subjunctive',
                   'interjection']);
const dbSchema = {
    pos: POS,
    number: new Set(['singular','plural']),
    gender: new Set(['masculine','feminine','neuter']),
    nouncase: new Set(['nominative',
                     'oblique',
                     'accusative',
                     'sociative',
                     'instrumental',
                     'dative',
                     'ablative',
                     'genitive',
                     'locative',
                     'vocative']),
    person: new Set(['first person','second person','third person']),
    aspect: new Set(['perfective aspect','imperfective aspect','negative','present tense']),
    voice: new Set(['passive','causative']),
    syntax: new Set(['muṟṟeccam','postposition','adverb','conjunction','relative']),
    verbfunction: new Set(['auxiliary','denomiative']),
    particlefunction: new Set(['concessive','indefinite','comparative','inclusive']),
    misc: new Set(['ideophone','honorific','proper name']),
    rootnoun: new Set(['verbal root as adjective',
                       'verbal root as gerundive',
                       'verbal root as imperative',
                       'verbal root as infinitive',
                       'verbal root as peyareccam',
                       'verbal root as peyareccam imperfective aspect',
                       'verbal root as peyareccam perfective aspect'])
};
export {gramAbbreviations, gramMap, dbSchema};
