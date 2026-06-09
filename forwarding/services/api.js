import { post } from '../../shared/http.js';

async function fetchData(lpu, from, to, delay = 1000) {
    const url = `?c=EMDREMD&m=EMDSearchStrict&_dc=${Date.now()}`;
    const params = new URLSearchParams({
        EMDLpu_id: '21',
        LpuBuilding_id: String(lpu),
        EMDRegistry_EMDDate_period: `${from} — ${to}`,
        EMDVersion_RegistrationDate_period: '',
        EMDRegistry_Num: '',
        EMDVersionStatus: '3',
        EMDDocumentType_Code: 'null',
        EMDErrorListGroup_id: '',
        ReceptType_id: '',
        hidedeletedoc: '1',
        isGlobalAndActive: 'true',
        limit: '5000',
        LpuSection_id: 'null',
        Person_FIO: '',
        MedPersonalFioIdArray: '',
        EvnNum: '',
        EvnClass_id: '',
        Diag_Code_from: 'null',
        Diag_Code_to: 'null',
        TreatmentClass_id: '',
        ResultClass_id: '',
        VizitType_id: '',
        PrehospType_id: '',
        LeaveType_id: '',
        PrehospArrive_id: '',
        PrehospStatus_id: '',
        page: '1',
        start: '0'
    });

    try {
        return await post(url, params.toString());
    } catch (error) {
        console.log('Ошибка запроса, повтор через', delay / 1000, 'секунд:', error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchData(lpu, from, to, Math.min(delay * 2, 30000));
    }
}

async function searchDocuments(from, to) {
    const DEPARTMENTS = [319, 303, 334, 313, 53, 2091, 2239, 2392, 2576, 2593, 2469, 2468, 2464, 2471, 2462, 2465, 2599, 2466, 2457, 2547, 2556, 2472, 2571, 2470, 2510, 2456, 2459, 2463, 2458, 2460, 2461, 2467, 2507, 2597, 2747, 4108, 4127, 4106, 4107, 4110, 4102, 4089, 4098, 4099, 4091, 4105, 4120, 4124, 4097, 4101, 4126, 4128, 4103, 4104, 4123, 4109, 4132, 4130, 4131, 4133, 4194, 4195, 4717, 5499, 5495, 5451, 5480, 5497, 5494, 5496, 5527, 5579, 5897, 5864, 5967, 5934];
    const promises = DEPARTMENTS.map(lpu => fetchData(lpu, from, to));
    return Promise.all(promises);
}

async function resendDocument(id) {
    const body = new URLSearchParams({ EMDVersion_id: String(id) });
    return post('?c=EMDREMD&m=reSend', body.toString());
}

export { searchDocuments, resendDocument };

