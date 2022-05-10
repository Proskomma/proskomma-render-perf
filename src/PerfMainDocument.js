import {JsonMainDocument} from 'proskomma-render-json';

export default class PerfMainDocument extends JsonMainDocument {

    constructor(result, context, config) {
        super(result, context, config);
        this.awaitingNewBlock = [];
        this.addLocalActions();
    }

    outputSequence(renderer, context) {
        return renderer.config.output
            .docSets[renderer.docSetModel.appData.currentDocSetId]
            .documents[context.document.headers.bookCode]
            .sequences[context.sequenceStack[0].id]
    }

    sequenceById(renderer, context, seqId) {
        return renderer.config.output
            .docSets[renderer.docSetModel.appData.currentDocSetId]
            .documents[context.document.headers.bookCode]
            .sequences[seqId]
    }

    lastBlock(renderer, context) {
        const sequence = this.outputSequence(renderer, context);
        return sequence.blocks[sequence.blocks.length - 1];
    }

    currentBlockContext(renderer, context) {
        const cbt1 = (arr) => {
            const lastElement = arr[arr.length - 1];
            if ((typeof lastElement) === 'string') {
                return arr;
            } else {
                return cbt1(lastElement.content);
            }
        }
        return cbt1(this.lastBlock(renderer, context).content);
    }

    addLocalActions() {
        this.addAction(
            'blockGraft',
            () => true,
            (renderer, context, data) => {
                const sequence = this.outputSequence(renderer, context);
                if (sequence.selected) {
                    if (!sequence.blocks) {
                        sequence.blocks = [];
                    }
                    if (
                        sequence.blocks.length === 0 ||
                        sequence.blocks[sequence.blocks.length - 1].subType !== 'hangingGraft'
                    ) {
                        sequence.blocks.push({});
                    }
                    sequence.blocks[sequence.blocks.length - 1].type = "graft";
                    sequence.blocks[sequence.blocks.length - 1].subType = data.subType;
                    sequence.blocks[sequence.blocks.length - 1].target = data.payload;
                    sequence.blocks[sequence.blocks.length - 1].nBlocks = this.sequenceById(renderer, context, data.payload).nBlocks;
                    sequence.blocks[sequence.blocks.length - 1].initialText = this.sequenceById(renderer, context, data.payload).initialText;
                    delete sequence.blocks[sequence.blocks.length - 1].content;
                    sequence.blocks.push(
                        {
                            type: "block",
                            subType: "hangingGraft",
                            content: [""],
                        }
                    );
                }
            }
        );
        this.addAction(
            'startBlock',
            () => true,
            (renderer, context, data) => {
                const sequence = this.outputSequence(renderer, context);
                if (sequence.selected) {
                    if (!sequence.blocks) {
                        sequence.blocks = [];
                    }
                    if (
                        sequence.blocks.length === 0 ||
                        sequence.blocks[sequence.blocks.length - 1].subType !== 'hangingGraft'
                    ) {
                        sequence.blocks.push({
                            type: "block",
                            content: [],
                        })
                    }
                    sequence.blocks[sequence.blocks.length - 1].subType = data.bs.payload.split('/')[1] || data.bs.payload;
                    sequence.blocks[sequence.blocks.length - 1].content.push("");
                }
            }
        );
        this.addAction(
            'token',
            () => true,
            (renderer, context, data) => {
                const sequence = this.outputSequence(renderer, context);
                if (sequence.selected) {
                    const tokenValue =
                        ["lineSpace", "eol"].includes(data.subType) ?
                            " " :
                            data.payload;
                    const cbt = this.currentBlockContext(renderer, context);
                    cbt[cbt.length - 1] += tokenValue;
                }
            }
        );
        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith('chapter/'),
            (renderer, context, data) => {
                const sequence = this.outputSequence(renderer, context);
                if (sequence.selected) {
                    this.lastBlock(renderer, context).content.push({
                        type: "chapter",
                        number: `${data.payload.split('/')[1]}`
                    });
                    this.lastBlock(renderer, context).content.push("");
                }
            }
        );
        this.addAction(
            'scope',
            (context, data) => data.subType === 'start' && data.payload.startsWith('verses/'),
            (renderer, context, data) => {
                const sequence = this.outputSequence(renderer, context);
                if (sequence.selected) {
                    this.lastBlock(renderer, context).content.push({
                        type: "verses",
                        number: `${data.payload.split('/')[1]}`
                    });
                    this.lastBlock(renderer, context).content.push("");
                }
            }
        );
        this.addAction(
            'inlineGraft',
            (context, data) => true,
            (renderer, context, data) => {
                const sequence = this.outputSequence(renderer, context);
                if (sequence.selected) {
                    this.currentBlockContext(renderer, context).push(
                        {
                            type: "graft",
                            subType: data.subType,
                            target: data.payload,
                            nBlocks: this.sequenceById(renderer, context, data.payload).nBlocks,
                            initialText: this.sequenceById(renderer, context, data.payload).initialText,
                        },
                        ""
                    );
                }
            }
        );
    }


}
