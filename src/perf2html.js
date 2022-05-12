const bgHtml = bg => `    <div class="graft ${bg.subType}" data-graftType="${bg.subType}" data-target="${bg.target}" data-nBlocks="${bg.nBlocks}">${bg.initialText}</div>`;

const blockHtml = b => `    <div class="block ${b.subType}">${b.content.map(bc => blockItemHtml(bc)).join('')}</div>`;

const blockItemHtml = bi => (typeof bi === 'string') ? bi : blockItemObjectHtml(bi);

const blockItemObjectHtml = bi => bi.type === 'graft' ? inlineGraftHtml(bi) : cvObjectHtml(bi);

const inlineGraftHtml = bg => `<span class="graft ${bg.subType}" data-graftType="${bg.subType}" data-target="${bg.target}" data-nBlocks="${bg.nBlocks}">${bg.initialText}</span>`;

const cvObjectHtml = bi => `<span class="${bi.type}">${bi.number}</span>`

const perf2html = perf => {
    const [docSetId, docSetOb] = Object.entries(perf.docSets)[0];
    const [bookCode, documentOb] = Object.entries(docSetOb.documents)[0];
    const [sequenceId, sequenceOb] = Object.entries(documentOb.sequences).filter(s => s[1].selected)[0];
    return `<div id="sequence" data-docSetId="${docSetId}" data-bookCode="${bookCode}" data-sequenceId="${sequenceId}">
  <div id="headers">
${Object.entries(documentOb.headers).map(h =>
        `    <div class="header" id="header_${h[0]}">${h[1]}</div>`
    ).join('\n')
    }
  </div>
  <div id="content">
${sequenceOb.blocks.map(b => b.type === 'graft' ? bgHtml(b) : blockHtml(b)).join('\n')}
  </div>
</div>`
}

export default perf2html;
