const test = require('tape');
const path = require('path');
const fse = require('fs-extra');
const { UWProskomma } = require('uw-proskomma');
import { doRender } from '../../src';


const testGroup = 'Smoke';

test(
  `Hello (${testGroup})`,
  async function (t) {
    try {
      t.plan(1);
      const pk = new UWProskomma();
      const succinctJson = fse.readJsonSync(path.resolve(path.join(__dirname, '..', 'test_data', 'fra_lsg_succinct.json')));
      pk.loadSuccinctDocSet(succinctJson);
      const config = {
          selectedSequenceId: null,
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
      console.log(JSON.stringify(config2, null, 2));
      t.ok(true);
    } catch (err) {
      console.log(err);
    }
  },
);
