import {ScriptureDocSet} from 'proskomma-render';

export default class JsonMainDocSet extends ScriptureDocSet {

    constructor(result, context, config) {
        super(result, context, config);
        this.addLocalActions();
    }

    addLocalActions() {
        this.addAction(
            'startDocSet',
            () => true,
            (renderer, context, data) => {
                renderer.config.documents = {};
            });
    }

}
