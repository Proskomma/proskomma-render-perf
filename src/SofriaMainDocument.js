import {ScriptureParaDocument} from 'proskomma-render';
import {usfmHelps} from 'proskomma-json-tools';
import {camelCase2snakeCase} from './changeCase';

export default class SofriaMainDocument extends ScriptureParaDocument {

    constructor(result, context, config) {
        super(result, context, config);
        this.status = {
            currentChapter: null,
            currentVerses: null,
            currentSpans: [],
        }
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
                if (lastItem.content.length === 0) {
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
                        "structure": "nested",
                        "structure_version": "0.2.0",
                        "constraints": [
                            {
                                "name": "sofria",
                                "version": "0.2.0",
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
                    },
                    "sequences": {},
                };
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
                if (this.status.currentChapter) {
                    const content = this.currentLastBlock(context).content;
                    content.push({
                        type: 'wrapper',
                        sub_type: "chapter",
                        atts: {
                            number: this.status.currentChapter
                        },
                        content: []
                    })
                }
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
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith('chapter'),
            (renderer, context, data) => {
                this.status.currentChapter = data.payload.split('/')[1];
                const content = this.currentLastBlock(context).content;
                content.push({
                    type: 'wrapper',
                    sub_type: "chapter",
                    atts: {
                        number: this.status.currentChapter
                    },
                    content: []
                })
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith('chapter'),
            (renderer, context, data) => {
                this.status.currentChapter = null;
                const content = this.currentLastBlock(context).content;
                content.push("");
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith('verses'),
            (renderer, context, data) => {
                this.status.currentVerses = data.payload.split('/')[1];
                const content = this.lastContainer(this.currentLastBlock(context).content);
                content.push({
                    type: 'wrapper',
                    sub_type: "verses",
                    atts: {
                        number: this.status.currentVerses
                    },
                    content: []
                })
                for (const spanObject of this.status.currentSpans){
                    const content = this.lastContainer(this.currentLastBlock(context).content);
                    content.push(spanObject);
                }
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith('verses'),
            (renderer, context, data) => {
                this.status.currentVerses = null;
                const content = this.lastContainerParent(this.currentLastBlock(context).content);
                content.push("");
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith("span/") && usfmHelps.characterTags.includes(data.payload.split('/')[1]),
            (renderer, context, data) => {
                const wrapper = {
                    type: "wrapper",
                    sub_type: `usfm:${data.payload.split('/')[1]}`,
                    content: [],
                };
                this.status.currentSpans.push(wrapper);
                const content = this.lastContainer(this.currentLastBlock(context).content);
                content.push(wrapper);
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith("span/") && usfmHelps.characterTags.includes(data.payload.split('/')[1]),
            (renderer, context, data) => {
                this.status.currentSpans.pop();
                const content = this.lastContainerParent(this.currentLastBlock(context).content);
                content.push("");
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
