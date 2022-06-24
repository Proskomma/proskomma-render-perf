import {
    ScriptureParaModel,
    ScriptureParaModelQuery,
} from "proskomma-render";
import JsonMainDocSet from './JsonMainDocSet';
import PerfMainDocument from './PerfMainDocument';
import SofriaMainDocument from './SofriaMainDocument';
import {Validator} from 'proskomma-json-tools';

const doRender = async (pk, config, docSetIds, documentIds) => {
    const doMainRender = (config, result) => {
        const dModel = config.jsonType[0] === 'perf' ? new PerfMainDocument(result, {}, config): new SofriaMainDocument(result, {}, config);
        const dsModel = new JsonMainDocSet(result, {}, config);
        dsModel.addDocumentModel('default', dModel);
        const model = new ScriptureParaModel(result, config);
        model.addDocSetModel('default', dsModel);
        model.render();
        const validator = new Validator();
        const validations = {};
        Object.entries(config.documents)
            .forEach(
                ([dId, doc]) =>
                    validations[dId] = validator.validate('constraint', 'perfDocument', '0.2.0', doc));
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
