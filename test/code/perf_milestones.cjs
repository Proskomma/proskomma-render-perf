import test from 'tape';
import path from 'path';
import fse from 'fs-extra';
import {UWProskomma} from 'uw-proskomma';
import {doRender} from '../../src';

const testGroup = 'PERF Milestones';

const invalidDocs = (validations) => {
    const ret = {};
    for (const [docId, doc] of Object.entries(validations)) {
        if (!doc.isValid) {
            ret[docId] = doc;
        }
    }
    return ret;
}

test(
    `From ULT (${testGroup})`,
    async function (t) {
        try {
            t.plan(1);
            const pk = new UWProskomma();
            const usfm = fse.readFileSync(path.resolve(path.join(__dirname, '..', 'test_data', 'dcs-ult-tit.usfm'))).toString();
            pk.importDocuments({org: 'dcs', lang: 'en', abbr: 'ult'}, 'usfm', [usfm]);
            const config = {
                jsonType: ["perf", "0.2.0"],
                output: {
                    docSets: {},
                }
            };
            const query = '{docSets { id documents {id bookCode: header(id:"bookCode")} } }';
            const gqlResult = pk.gqlQuerySync(query);
            const docSetId = gqlResult.data.docSets[0].id;
            const documentId = gqlResult.data.docSets[0].documents.filter(d => d.bookCode === 'TIT')[0].id;
            const config2 = await doRender(
                pk,
                config,
                [docSetId],
                [documentId],
            );
            // const resultDocument = Object.values(config2.documents)[0];
            // console.log(JSON.stringify(config2.validations, null, 2));
            // console.log(JSON.stringify(resultDocument.sequences[resultDocument.main_sequence_id], null, 2));
            t.deepEqual(invalidDocs(config2.validations), {});
        } catch (err) {
            console.log(err);
        }
    },
);
