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
        if (jsonType === "perf") {
            this.config.documents[context.document.id].sequences = {};
        }
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
                sub_type: `usfm:${context.sequenceStack[0].block.blockScope.split('/')[1] || context.sequenceStack[0].block.blockScope}`,
                content: [""],
            }
        );
    }

    endBlock(context) {
        const lastBlock = this.currentLastBlock(context);
        lastBlock.content = lastBlock.content.filter(i => i !== "");
    }

    startSpan(context, data) {
        const content = this.lastContainer(this.currentLastBlock(context).content);
        content.push({
            type: "wrapper",
            sub_type: `usfm:${data.payload.split('/')[1]}`,
            content: [],
        });
    }

    endSpan(context) {
        const content = this.lastContainerParent(this.currentLastBlock(context).content);
        content.push("");
    }

    startSpanWithAtts(context, data) {
        const content = this.lastContainer(this.currentLastBlock(context).content);
        content.push({
            type: "wrapper",
            sub_type: `usfm:${data.payload.split('/')[1]}`,
            content: [],
            atts: {},
        });
    }

    endSpanWithAtts(context) {
        const content = this.lastContainerParent(this.currentLastBlock(context).content);
        content.push("");
    }

    emptyMilestone(context, tag) {
        const content = this.lastContainer(this.currentLastBlock(context).content);
        content.push({
            type: "mark",
            sub_type: `usfm:ts`,
            atts: {},
        });
    }

    startMilestone(context, data) {
        const content = this.lastContainer(this.currentLastBlock(context).content);
        content.push({
            type: "start_milestone",
            sub_type: `usfm:${data.payload.split('/')[1]}`,
            atts: {},
        });
    }

    endMilestone (context, data) {
        const content = this.lastContainer(this.currentLastBlock(context).content);
        content.push({
            type: "end_milestone",
            sub_type: `usfm:${data.payload.split('/')[1]}`,
        });
    }

    startAttribute (context, data) {
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

export {lastStringContainer, lastContainer, lastContainerParent, JsonMainDocument};