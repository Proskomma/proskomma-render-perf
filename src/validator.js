import Ajv from 'ajv';
import perfSchema from './perf_schema';

const ajv = new Ajv();

export default ajv.compile(perfSchema);
