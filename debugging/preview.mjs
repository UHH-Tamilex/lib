import { loadDoc } from './fileops.mjs';

const _state = {
    sheet: null
};

const getXSLTSheet = async doc => {
    for(const n of doc.childNodes) {
        if(n.nodeName === 'xml-stylesheet') {
            const temp = doc.createElement('outer');
            temp.innerHTML = `<inner ${n.data}/>`;
            const href = temp.firstChild.getAttribute('href');
            return loadDoc(href,'default');
        }
    }
};

const compileImports = async (xsltsheet,prefix='') => {
    const imports = xsltsheet.querySelectorAll('import');
    if(!imports) return xsltsheet;
    for(const x of imports) {
        const href = prefix + x.getAttribute('href');
        const split = href.split('/');
        split.pop();
        const newprefix = split.join('/') + '/';
        const i = await loadDoc(href,'default');
        for(const attr of i.documentElement.attributes) {
          if(!xsltsheet.documentElement.getAttributeNS(attr.namespaceURI,attr.localName))
            xsltsheet.documentElement.setAttributeNS(attr.namespaceURI,attr.name,attr.value);
        }
        while(i.documentElement.firstChild) {

            if(i.documentElement.firstChild.nodeName === 'xsl:param') {
                if(xsltsheet.querySelector(`variable[name="${i.documentElement.firstChild.getAttribute('name')}"]`)) { 
                    i.documentElement.firstChild.remove();
                    continue;
                }
            }
            if(i.documentElement.firstChild.nodeName === 'xsl:import') {
                const ii = await loadDoc(newprefix + i.documentElement.firstChild.getAttribute('href'),'default');
                const embed = await compileImports(ii,newprefix);
                while(embed.documentElement.firstChild)
                        x.before(embed.documentElement.firstChild);
                for(const attr of embed.documentElement.attributes) {
                  if(!xsltsheet.documentElement.getAttributeNS(attr.namespaceURI,attr.localName))
                    xsltsheet.documentElement.setAttributeNS(attr.namespaceURI,attr.name,attr.value);
                }
                i.documentElement.firstChild.remove();
                continue;
            }

            x.before(i.documentElement.firstChild);
        }
        x.remove();
    }
    return xsltsheet;
};
/*
const compileImports = async (xsltsheet,relurl) => {
    const imports = xsltsheet.querySelectorAll('import');
    if(!imports) return xsltsheet;
    if(!relurl) relurl = window.location.href;
    for(const x of imports) {
        const href = (new URL(x.getAttribute('href'),relurl)).href;
        const i = await loadDoc(href,'default');
        while(i.documentElement.firstChild) {

            if(i.documentElement.firstChild.nodeName === 'xsl:param') {
                if(xsltsheet.querySelector(`variable[name="${i.documentElement.firstChild.getAttribute('name')}"]`)) { 
                    i.documentElement.firstChild.remove();
                    continue;
                }
            }
            if(i.documentElement.firstChild.nodeName === 'xsl:import') {
                const newhref = (new URL(i.documentElement.firstChild.getAttribute('href'),href)).href;
                const ii = await loadDoc(newhref);
                const embed = await compileImports(ii,newhref);
                while(embed.documentElement.firstChild)
                        x.before(embed.documentElement.firstChild);
                i.documentElement.firstChild.remove();
                continue;
            }

            x.before(i.documentElement.firstChild);
        }
        
        for(const attr of i.documentElement.attributes) {
          if(!xsltsheet.documentElement.getAttributeNS(attr.namespaceURI,attr.localName))
            xsltsheet.documentElement.setAttributeNS(attr.namespaceURI,attr.name,attr.value);
        }

        x.remove();
    }
    return xsltsheet;
};
*/
const XSLTransform = async (xsltsheet, doc) => {
    const xproc = new XSLTProcessor();
    const compiled = await compileImports(xsltsheet);
    xproc.importStylesheet(compiled);
    return xproc.transformToDocument(doc);
};

const previewDoc = async doc => {
    if(!_state.sheet) _state.sheet = await getXSLTSheet(doc);
    return await XSLTransform(_state.sheet, doc);
};

export default previewDoc;
