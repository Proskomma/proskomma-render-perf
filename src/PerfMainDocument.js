import {ScriptureParaDocument} from 'proskomma-render';

export default class PerfMainDocument extends ScriptureParaDocument {

    constructor(result, context, config) {
        super(result, context, config);
        this.addLocalActions();
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
                        "structureVersion": "0.1.0",
                        "constraints": [
                            {
                                "name": "perf",
                                "version": "0.1.0"
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
                    type: data.type,
                    blocks: [],
                };
                if (data.type === 'main') {
                    this.config.documents[context.document.id].mainSequenceId = data.id;
                }
            }
        );

        this.addAction(
            'startItems',
            () => true,
            (renderer, context, data) => {
                this.config.documents[context.document.id]
                    .sequences[context.sequenceStack[0].id]
                    .blocks.push(
                    {
                        type: "paragraph",
                        subType: `usfm:${context.sequenceStack[0].block.blockScope.split('/')[1] || context.sequenceStack[0].block.blockScope}`,
                        content: [],
                    }
                );
            }
        );

        this.addAction(
            'blockGraft',
            () => true,
            (renderer, context, data) => {
                this.config.documents[context.document.id]
                    .sequences[context.sequenceStack[0].id]
                    .blocks.push(
                    {
                        type: "graft",
                        subType: data.subType,
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
                const blocks = this.config.documents[context.document.id]
                    .sequences[context.sequenceStack[0].id]
                    .blocks;
                const content = blocks[blocks.length - 1].content;
                content.push({
                    type: 'mark',
                    subType: data.payload.split('/')[0],
                    atts: {
                        number: `${data.payload.split('/')[1]}`
                    }
                })
            }
        );

        this.addAction(
            'token',
            () => true,
            (renderer, context, data) => {
                const chars = ['lineSpace', 'eol'].includes(data.subType) ? ' ' : data.payload;
                const blocks = this.config.documents[context.document.id]
                    .sequences[context.sequenceStack[0].id]
                    .blocks;
                const content = blocks[blocks.length - 1].content;
                const lastItem = content[content.length - 1];
                if (lastItem && typeof lastItem === 'string') {
                    content[content.length - 1] = lastItem + chars;
                } else {
                    content.push(chars);
                }
            }
        );
    }

}
