import {ScriptureParaDocument} from 'proskomma-render';
import {usfmHelps} from 'proskomma-json-tools';
import {camelCase2snakeCase} from './changeCase';
import {lastStringContainer, lastContainer, lastContainerParent, JsonMainDocument} from './sharedDocument';

export default class SofriaMainDocument extends JsonMainDocument {

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
        return lastStringContainer(content);
    }

    lastContainer(content) {
        return lastContainer(content);
    }

    lastContainerParent(content) {
        return lastContainerParent(content);
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
                this.setupDocuments(context, 'sofria', '0.2.0', '0.2.0');
                this.config.documents[context.document.id].sequences = {}; // TEMPORARY
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
                for (const spanObject of this.status.currentSpans) {
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
                this.startSpan(context, data);
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith("span/") && usfmHelps.characterTags.includes(data.payload.split('/')[1]),
            (renderer, context, data) => {
                this.endSpan(context);
            }
        );

        this.addAction(
            'token',
            () => true,
            (renderer, context, data) => {
                this.defaultToken(context, data);
            }
        );
    }

}
