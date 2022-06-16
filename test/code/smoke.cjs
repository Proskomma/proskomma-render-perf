import test from 'tape';
import path from 'path';
import fse from 'fs-extra';
import {UWProskomma} from 'uw-proskomma';
import {doRender} from '../../src';

const testGroup = 'Smoke';

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
    `From Succinct (${testGroup})`,
    async function (t) {
        try {
            t.plan(1);
            const pk = new UWProskomma();
            const succinctJson = fse.readJsonSync(path.resolve(path.join(__dirname, '..', 'test_data', 'fra_lsg_succinct.json')));
            pk.loadSuccinctDocSet(succinctJson);
            const config = {
                selectedSequenceId: null,
                allSequences: false,
            };
            const query = '{docSets { id documents {id bookCode: header(id:"bookCode")} } }';
            const gqlResult = pk.gqlQuerySync(query);
            const docSetId = gqlResult.data.docSets[0].id;
            const documentId = gqlResult.data.docSets[0].documents.filter(d => d.bookCode === 'MRK')[0].id;
            const config2 = await doRender(
                pk,
                config,
                [docSetId],
                [documentId],
            );
            const resultDocument = Object.values(config2.documents)[0];
            // console.log(JSON.stringify(config2.validations, null, 2));
            // console.log(JSON.stringify(resultDocument, null, 2));
            // console.log(JSON.stringify(resultDocument.sequences[resultDocument.main_sequence_id], null, 2));
            t.deepEqual(invalidDocs(config2.validations), {});
        } catch (err) {
            console.log(err);
        }
    },
);

test(
    `From USFM with REM (${testGroup})`,
    async function (t) {
        try {
            t.plan(1);
            const pk = new UWProskomma();
            const usfm = fse.readFileSync(path.resolve(path.join(__dirname, '..', 'test_data', 'bcs-hi_irv.rev.usfm'))).toString();
            pk.importDocuments({org: 'bcs', lang: 'hi', abbr: 'irv'}, 'usfm', [usfm]);
            const config = {
                selectedSequenceId: null,
                allSequences: true,
                output: {
                    docSets: {},
                }
            };
            const query = '{docSets { id documents {id bookCode: header(id:"bookCode")} } }';
            const gqlResult = pk.gqlQuerySync(query);
            const docSetId = gqlResult.data.docSets[0].id;
            const documentId = gqlResult.data.docSets[0].documents.filter(d => d.bookCode === 'REV')[0].id;
            pk.gqlQuerySync(`mutation { addDocSetTags(docSetId: "${docSetId}", tags: ["production", "title:IRV"]) }`);
            pk.gqlQuerySync(`mutation { addDocumentTags(docSetId: "${docSetId}", documentId: "${documentId}", tags: ["checked", "isAligned:false"]) }`);
            const config2 = await doRender(
                pk,
                config,
                [docSetId],
                [documentId],
            );
            t.deepEqual(invalidDocs(config2.validations), {});
            // console.log(JSON.stringify(config2.documents[documentId], null, 2));
        } catch (err) {
            console.log(err);
        }
    },
);
