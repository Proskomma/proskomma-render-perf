import {
    ScriptureParaModel,
    ScriptureParaModelQuery,
} from "proskomma-render";
import PerfMainDocSet from './PerfMainDocSet';
import PerfMainDocument from './PerfMainDocument';
import {Validator} from 'proskomma-json-tools';

const doRender = async (pk, config, docSetIds, documentIds) => {
    const doMainRender = (config, result) => {
        const dModel = new PerfMainDocument(result, {}, config);
        const dsModel = new PerfMainDocSet(result, {}, config);
        dsModel.addDocumentModel('default', dModel);
        const model = new ScriptureParaModel(result, config);
        model.addDocSetModel('default', dsModel);
        model.render();
        const validator = new Validator();
        const validations = {};
        Object.entries(config.documents)
            .forEach(
                ([dId, doc]) =>
                    validations[dId] = validator.validate('constraint', 'perfDocument', '0.1.0', doc));
        model.config.validations = validations;
        return model.config;
    }
    const thenFunction = result => {
        return doMainRender(config, result);

    }
    const result = await ScriptureParaModelQuery(pk, docSetIds || [], documentIds || []);
    return thenFunction(result);
};

export {doRender}
