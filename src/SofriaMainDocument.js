import {ScriptureParaDocument} from 'proskomma-render';
import {usfmHelps} from 'proskomma-json-tools';
import {camelCase2snakeCase} from './changeCase';
import {
    lastStringContainer,
    lastContainer,
    lastContainerParent,
    JsonMainDocument,
    removeEmptyStrings,
    nestSequences,
} from './sharedDocument';

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
                this.config.documents[context.document.id].main_sequence_id = {};
            });

        this.addAction(
            'endDocument',
            () => true,
            (renderer, context, data) => {
                const currentOutputDocument = this.config.documents[context.document.id];
                for (const sequence of Object.values(currentOutputDocument.sequences)) {
                    for (const block of sequence.blocks) {
                        if (block.type === 'graft') {
                            continue;
                        }
                        block.content = removeEmptyStrings(block.content);
                    }
                }
                currentOutputDocument.sequence = currentOutputDocument.sequences[currentOutputDocument.main_sequence_id];
                nestSequences(
                    currentOutputDocument.sequences,
                    currentOutputDocument.sequence
                );
                delete currentOutputDocument.sequences;
                delete currentOutputDocument.main_sequence_id;

            }
        );

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
                        subtype: `usfm:${context.sequenceStack[0].block.blockScope.split('/')[1] || context.sequenceStack[0].block.blockScope}`,
                        content: [""],
                    }
                );
                if (this.status.currentChapter && context.sequenceStack[0].type === 'main') {
                    const content = this.currentLastBlock(context).content;
                    content.push({
                        type: 'wrapper',
                        subtype: "chapter",
                        atts: {
                            number: this.status.currentChapter
                        },
                        content: []
                    })
                }
                if (this.status.currentVerses && context.sequenceStack[0].type === 'main') {
                    const content = this.lastContainer(this.currentLastBlock(context).content);
                    content.push({
                        type: 'wrapper',
                        subtype: "verses",
                        atts: {
                            number: this.status.currentVerses
                        },
                        content: []
                    })
                }
            }
        );

        this.addAction(
            'blockGraft',
            () => true,
            (renderer, context, data) => {
                this.currentBlocks(context).push(
                    {
                        type: "graft",
                        target: data.payload
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
                        target: data.payload
                    }
                );
                this.renderSequenceId(data.payload);
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
                    subtype: "chapter",
                    atts: {
                        number: this.status.currentChapter
                    },
                    content: [{
                        type: "mark",
                        subtype: "chapter_label",
                        atts: {
                            number: this.status.currentChapter
                        }
                    }]
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
                    subtype: "verses",
                    atts: {
                        number: this.status.currentVerses
                    },
                    content: [{
                        type: "mark",
                        subtype: "verses_label",
                        atts: {
                            number: this.status.currentVerses
                        }
                    }]
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
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith("spanWithAtts/"),
            (renderer, context, data) => {
                this.startSpanWithAtts(context, data);
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith("spanWithAtts/"),
            (renderer, context) => {
                this.endSpanWithAtts(context);
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith("milestone/") && data.payload.split('/')[1] === 'ts',
            (renderer, context, data) => {
                this.emptyMilestone(context, 'ts');
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith("milestone/") && data.payload.split('/')[1] === 'ts',
            (renderer, context, data) => {
            },
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith("milestone/"),
            (renderer, context, data) => {
                this.startMilestone(context, data);
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith("milestone/"),
            (renderer, context, data) => {
                this.endMilestone(context, data);
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith("attribute/"),
            (renderer, context, data) => {
                this.startAttribute(context, data);
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
