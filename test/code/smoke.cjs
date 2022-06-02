const test = require('tape');
const path = require('path');
const fse = require('fs-extra');
const {UWProskomma} = require('uw-proskomma');
import {doRender} from '../../src';

const testGroup = 'Smoke';

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
                output: {
                    docSets: {},
                }
            };
            const query = '{docSets { id documents {id bookCode: header(id:"bookCode")} } }';
            const gqlResult = pk.gqlQuerySync(query);
            const docSetId = gqlResult.data.docSets[0].id;
            const documentId = gqlResult.data.docSets[0].documents.filter(d => d.bookCode === 'JON')[0].id;
            const config2 = await doRender(
                pk,
                config,
                [docSetId],
                [documentId],
            );
            t.equal(config2.validationErrors, null);
            // console.log(JSON.stringify(config2.output.docSets["eBible/fra_fraLSG"].documents["JON"], null, 2));
            // console.log(config2.validationErrors);
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
            const config2 = await doRender(
                pk,
                config,
                [docSetId],
                [documentId],
            );
            t.equal(config2.validationErrors, null);
            // console.log(JSON.stringify(config2.output.docSets["bcs/hi_irv"].documents["REV"].sequences, null, 2));
            // console.log(config2.validationErrors);
        } catch (err) {
            console.log(err);
        }
    },
);
