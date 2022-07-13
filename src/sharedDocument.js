import {ScriptureParaDocument} from 'proskomma-render';

const lastStringContainer = function (content) {
    if (content.length === 0) {
        content.push("");
        return content;
    } else {
        const lastItem = content[content.length - 1];
        if (typeof lastItem === "string") {
            return content;
        } else if (lastItem.content) {
            return lastStringContainer(lastItem.content);
        } else {
            content.push("");
            return content;
        }
    }
}

function lastContainer(content) {
    if (content.length === 0) {
        return content;
    } else {
        const lastItem = content[content.length - 1];
        if (typeof lastItem === "string") {
            return content;
        } else if (lastItem.content) {
            return lastContainer(lastItem.content);
        } else {
            return content;
        }
    }
}

function lastContainerParent(content) {
    if (content.length === 0) {
        return null;
    } else {
        const lastItem = content[content.length - 1];
        if (typeof lastItem === "string") {
            return null;
        } else if (lastItem.content) {
            if (lastItem.content.length === 0) {
                return content;
            } else if (typeof lastItem.content[lastItem.content.length - 1] === "string") {
                return content;
            } else {
                return lastContainerParent(lastItem.content);
            }
        } else {
            return null;
        }
    }
}

function removeEmptyStrings(content) {
    let ret = [];
    for (const item of content) {
        if (typeof item === 'string' && item !== "") {
            ret.push(item);
        } else if (typeof item !== 'string') {
            const newItem = {...item};
            if ('content' in item) {
                newItem.content = removeEmptyStrings(item.content);
            }
            if ('metaContent' in item) {
                newItem.metaContent = removeEmptyStrings(item.metaContent);
            }
            ret.push(newItem);
        }
    }
    return ret;
}

function nestSequences(sequences, seq) {
    const nestContent = function (container) {
        return container.map(
            i => {
                if (i.type === 'graft') {
                    i.sequence = nestSequences(sequences, sequences[i.target]);
                } else if (i.type === 'wrapper') {
                    for (const container of ["content", "metaContent"]) {
                        if (i[container]) {
                            i[container] = nestContent(i[container])
                        }
                    }
                }
                return i;
            }
        )
    }
    const ret = seq; // shallow copy
    for (const block of seq.blocks) {
        if (block.type === 'graft') {
            block.sequence = nestSequences(sequences, sequences[block.target]);
            delete block.target;
        } else {
            for (const container of ["content", "metaContent"]) {
                if (block[container]) {
                    block[container] = nestContent(block[container])
                }
            }
        }
    }
    return ret;
}

class JsonMainDocument extends ScriptureParaDocument {

    setupDocuments(context, jsonType, structureVersion, constraintVersion) {
        const docSetContext = this.docSetModel.context.docSet;
        this.config.documents[context.document.id] = {
            "schema": {
                "structure": jsonType === "perf" ? "flat" : "nested",
                "structure_version": structureVersion,
                "constraints": [
                    {
                        "name": jsonType,
                        "version": constraintVersion,
                    }
                ]
            },
            "metadata": {
                "translation": {
                    "id": docSetContext.id,
                    "selectors": docSetContext.selectors,
                    "tags": [],
                    "properties": {},
                },
                "document": {
                    "tags": [],
                    "properties": {},
                }
            }
        };
        this.config.documents[context.document.id].sequences = {};
        docSetContext.tags.forEach(
            t => {
                if (t.includes(':')) {
                    const [k, v] = t.split(':');
                    this.config.documents[context.document.id].metadata.translation.properties[k] = v;
                } else {
                    this.config.documents[context.document.id].metadata.translation.tags.push(t);
                }
            }
        )
        context.document.tags.forEach(
            t => {
                if (t.includes(':')) {
                    const [k, v] = t.split(':');
                    this.config.documents[context.document.id].metadata.document.properties[k] = v;
                } else {
                    this.config.documents[context.document.id].metadata.document.tags.push(t);
                }
            }
        )
        Object.entries(context.document.headers)
            .forEach(
                ([k, v]) =>
                    this.config.documents[context.document.id].metadata.document[k] = v
            );
    };

    startItems(context) {
        this.currentBlocks(context).push(
            {
                type: "paragraph",
                subtype: `usfm:${context.sequenceStack[0].block.blockScope.split('/')[1] || context.sequenceStack[0].block.blockScope}`,
                content: [""],
            }
        );
    }

    endBlock(context) {
        const lastBlock = this.currentLastBlock(context);
        lastBlock.content = lastBlock.content.filter(i => i !== "");
    }

    startSpan(context, data) {
        const wrapper = {
            type: "wrapper",
            subtype: `usfm:${data.payload.split('/')[1]}`,
            content: [],
        };
        this.status.currentSpans.push(wrapper);
        const content = this.lastContainer(this.currentLastBlock(context).content);
        content.push(wrapper);
    }

    endSpan(context) {
        this.status.currentSpans.pop();
        const content = this.lastContainerParent(this.currentLastBlock(context).content);
        content.push("");
    }

    startSpanWithAtts(context, data) {
        const wrapper = {
            type: "wrapper",
            subtype: `usfm:${data.payload.split('/')[1]}`,
            content: [],
            atts: {},
        };
        this.status.currentSpans.push(wrapper);
        const content = this.lastContainer(this.currentLastBlock(context).content);
        content.push(wrapper);
    }

    endSpanWithAtts(context) {
        this.status.currentSpans.pop();
        const content = this.lastContainerParent(this.currentLastBlock(context).content);
        content.push("");
    }

    emptyMilestone(context, tag) {
        const content = this.lastContainer(this.currentLastBlock(context).content);
        content.push({
            type: "mark",
            subtype: `usfm:ts`,
            atts: {},
        });
    }

    startMilestone(context, data) {
        const content = this.lastContainer(this.currentLastBlock(context).content);
        content.push({
            type: "start_milestone",
            subtype: `usfm:${data.payload.split('/')[1]}`,
            atts: {},
        });
    }

    endMilestone(context, data) {
        const content = this.lastContainer(this.currentLastBlock(context).content);
        content.push({
            type: "end_milestone",
            subtype: `usfm:${data.payload.split('/')[1]}`,
        });
    }

    startAttribute(context, data) {
        const attBits = data.payload.split('/');
        const milestoneType = attBits[1];
        const attKey = attBits[3];
        const attValue = attBits[5];
        let content;
        if (milestoneType === 'spanWithAtts') {
            content = this.lastContainerParent(this.currentLastBlock(context).content);
        } else {
            content = this.lastContainer(this.currentLastBlock(context).content);
        }
        if (content.length === 0 || typeof content[content.length - 1] === 'string' || !content[content.length - 1].atts) {
            throw new Error(`Could not add attribute to ${content[content.length - 1]}`);
        }
        if (attKey in content[content.length - 1].atts) {
            content[content.length - 1].atts[attKey].push(attValue);
        } else {
            content[content.length - 1].atts[attKey] = [attValue];
        }
    }

    defaultToken(context, data) {
        const chars = ['lineSpace', 'eol'].includes(data.subType) ? ' ' : data.payload;
        const content = this.currentLastBlock(context).content;
        const lastStringContainer = this.lastStringContainer(content);
        lastStringContainer[lastStringContainer.length - 1] = lastStringContainer[lastStringContainer.length - 1] + chars;
    }

}

export {lastStringContainer, lastContainer, lastContainerParent, removeEmptyStrings, nestSequences, JsonMainDocument};
