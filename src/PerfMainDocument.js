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
            'startBlock',
            () => true,
            (renderer, context, data) => {
                const sequence = this.outputSequence(renderer, context);
                if (sequence.selected) {
                    if (!sequence.blocks) {
                        sequence.blocks = [];
                    }
                    data.bg.map(bg => {
                        sequence.blocks.push({
                            type: "graft",
                            subType: bg.subType,
                            target: bg.payload,
                        });
                    });
                    sequence.blocks.push({
                        type: "block",
                        subType: data.bs.payload.split('/')[1] || data.bs.payload,
                        content: [""],
                    });
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
                    this.lastBlock(renderer, context).content.push("");                }
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
                    this.lastBlock(renderer, context).content.push("");                }
            }
        );
    }


}
