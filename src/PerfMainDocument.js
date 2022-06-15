import {ScriptureParaDocument} from 'proskomma-render';
import {usfmHelps} from 'proskomma-json-tools';
import {camelCase2snakeCase} from './changeCase';

export default class PerfMainDocument extends ScriptureParaDocument {

    constructor(result, context, config) {
        super(result, context, config);
        this.addLocalActions();
    }

    lastStringContainer(content) {
        if (content.length === 0) {
            content.push("");
            return content;
        } else {
            const lastItem = content[content.length - 1];
            if (typeof lastItem === "string") {
                return content;
            } else if (lastItem.content) {
                return this.lastStringContainer(lastItem.content);
            } else {
                content.push("");
                return content;
            }
        }
    }

    lastContainer(content) {
        if (content.length === 0) {
            return content;
        } else {
            const lastItem = content[content.length - 1];
            if (typeof lastItem === "string") {
                return content;
            } else if (lastItem.content) {
                return this.lastContainer(lastItem.content);
            } else {
                return content;
            }
        }
    }

    lastContainerParent(content) {
        if (content.length === 0) {
            return null;
        } else {
            const lastItem = content[content.length - 1];
            if (typeof lastItem === "string") {
                return null;
            } else if (lastItem.content) {
                if (lastItem.content.length == 0) {
                    return content;
                } else if (typeof lastItem.content[lastItem.content.length - 1] === "string") {
                    return content;
                } else {
                    return this.lastContainerParent(lastItem.content);
                }
            } else {
                return null;
            }
        }
    }

    currentBlocks(context) {
        return this.config.documents[context.document.id]
            .sequences[context.sequenceStack[0].id]
            .blocks;
    }

    currentLastBlock(context) {
        const blocks = this.currentBlocks(context);
        return blocks[blocks.length - 1];
    }

    addLocalActions() {
        this.addAction(
            'startDocument',
            () => true,
            (renderer, context, data) => {
                const docSetContext = this.docSetModel.context.docSet;
                this.config.documents[context.document.id] = {
                    "schema": {
                        "structure": "flat",
                        "structure_version": "0.2.0",
                        "constraints": [
                            {
                                "name": "perf",
                                "version": "0.2.0"
                            }
                        ]
                    },
                    "metadata": {
                        "translation": {
                            "id": docSetContext.id,
                            "selectors": docSetContext.selectors,
                            "tags": docSetContext.tags,
                        },
                        "document": {
                            "tags": [],
                        }
                    },
                    "sequences": {},
                };
                Object.entries(context.document.headers)
                    .forEach(
                        ([k, v]) =>
                            this.config.documents[context.document.id].metadata.document[k] = v
                    );
            });

        this.addAction(
            'startSequence',
            () => true,
            (renderer, context, data) => {
                this.config.documents[context.document.id].sequences[data.id] = {
                    type: camelCase2snakeCase(data.type),
                    blocks: [],
                };
                if (data.type === 'main') {
                    this.config.documents[context.document.id].main_sequence_id = data.id;
                }
            }
        );

        this.addAction(
            'startItems',
            () => true,
            (renderer, context, data) => {
                this.currentBlocks(context).push(
                    {
                        type: "paragraph",
                        sub_type: `usfm:${context.sequenceStack[0].block.blockScope.split('/')[1] || context.sequenceStack[0].block.blockScope}`,
                        content: [""],
                    }
                );
            }
        );

        this.addAction(
            'endBlock',
            () => true,
            (renderer, context, data) => {
                const lastBlock = this.currentLastBlock(context);
                lastBlock.content = lastBlock.content.filter(i => i !== "");
            }
        );

        this.addAction(
            'blockGraft',
            () => true,
            (renderer, context, data) => {
                this.currentBlocks(context).push(
                    {
                        type: "graft",
                        sub_type: camelCase2snakeCase(data.subType),
                        target: data.payload,
                    }
                );
                this.renderSequenceId(data.payload);
            }
        );

        this.addAction(
            'inlineGraft',
            () => true,
            (renderer, context, data) => {
                const content = this.lastContainer(this.currentLastBlock(context).content);
                content.push(
                    {
                        type: "graft",
                        sub_type: camelCase2snakeCase(data.subType),
                        target: data.payload,
                    }
                );
                this.renderSequenceId(data.payload);
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && (data.payload.startsWith('chapter') || data.payload.startsWith('verses')),
            (renderer, context, data) => {
                const content = this.lastContainer(this.currentLastBlock(context).content);
                content.push({
                    type: 'mark',
                    sub_type: data.payload.split('/')[0],
                    atts: {
                        number: `${data.payload.split('/')[1]}`
                    }
                })
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith("span/") && usfmHelps.characterTags.includes(data.payload.split('/')[1]),
            (renderer, context, data) => {
                const content = this.lastContainer(this.currentLastBlock(context).content);
                content.push({
                    type: "wrapper",
                    sub_type: `usfm:${data.payload.split('/')[1]}`,
                    content: [],
                });
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith("span/") && usfmHelps.characterTags.includes(data.payload.split('/')[1]),
            (renderer, context, data) => {
                const content = this.lastContainerParent(this.currentLastBlock(context).content);
                content.push("");
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith("spanWithAtts/"),
            (renderer, context, data) => {
                const content = this.lastContainer(this.currentLastBlock(context).content);
                content.push({
                    type: "wrapper",
                    sub_type: `usfm:${data.payload.split('/')[1]}`,
                    content: [],
                    atts: {},
                });
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith("spanWithAtts/"),
            (renderer, context, data) => {
                const content = this.lastContainerParent(this.currentLastBlock(context).content);
                content.push("");
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith("milestone/"),
            (renderer, context, data) => {
                const content = this.lastContainer(this.currentLastBlock(context).content);
                content.push({
                    type: "start_milestone",
                    sub_type: `usfm:${data.payload.split('/')[1]}`,
                    atts: {},
                });
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith("milestone/"),
            (renderer, context, data) => {
                const content = this.lastContainer(this.currentLastBlock(context).content);
                content.push({
                    type: "end_milestone",
                    sub_type: `usfm:${data.payload.split('/')[1]}`,
                });
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith("attribute/"),
            (renderer, context, data) => {
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
        );

        this.addAction(
            'token',
            () => true,
            (renderer, context, data) => {
                const chars = ['lineSpace', 'eol'].includes(data.subType) ? ' ' : data.payload;
                const content = this.currentLastBlock(context).content;
                const lastStringContainer = this.lastStringContainer(content);
                lastStringContainer[lastStringContainer.length - 1] = lastStringContainer[lastStringContainer.length - 1] + chars;
            }
        );
    }

}
