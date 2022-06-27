import {usfmHelps} from 'proskomma-json-tools';
import {camelCase2snakeCase} from './changeCase';
import {lastStringContainer, lastContainer, lastContainerParent, JsonMainDocument} from './sharedDocument';

export default class PerfMainDocument extends JsonMainDocument {

    constructor(result, context, config) {
        super(result, context, config);
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
                this.setupDocuments(context, 'perf', '0.2.0', '0.2.0');
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
                this.startItems(context);
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
                this.startSpan(context, data);
            }
        );

        this.addAction(
            'scope',
            (context, data) => data.subType === 'end' && data.payload.startsWith("span/") && usfmHelps.characterTags.includes(data.payload.split('/')[1]),
            (renderer, context) => {
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
            (renderer, context, data) => {},
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
