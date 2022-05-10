import {
    ScriptureParaModel,
    ScriptureParaModelQuery,
} from "proskomma-render";
import PerfMainDocSet from './PerfMainDocSet';
import PerfMainDocument from './PerfMainDocument';
const doRender = async (pk, config, docSetIds, documentIds) => {
    const doMainRender = (config, result) => {
        const dModel = new PerfMainDocument(result, {}, config);
        const dsModel = new PerfMainDocSet(result, {}, config);
        dsModel.addDocumentModel('default', dModel);
        const model = new ScriptureParaModel(result, config);
        model.addDocSetModel('default', dsModel);
        model.render();
        return model.config;
    }
    const thenFunction = result => {
        return doMainRender(config, result);

    }
    const result = await ScriptureParaModelQuery(pk, docSetIds || [], documentIds || []);
    return thenFunction(result);
};

export {doRender}
