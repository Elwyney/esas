const path = require('path');
const fs = require('fs');
const CRYPTCP = '/opt/cprocsp/bin/amd64/cryptcp';
const CPVERIFY = '/opt/cprocsp/bin/amd64/cpverify';
const THUMBPRINT = 'EB9F9A5F1DFA646133BD79E116380E3B835D194C';
const { execSync } = require('child_process');
function signFile(filePath) {
    const tmpDir = fs.mkdtempSync('/tmp/sign_');
    const tmpFile = path.join(tmpDir, 'doc.xml');
    fs.copyFileSync(filePath, tmpFile);

    try {
        execSync(
            `cd "${tmpDir}" && "${CRYPTCP}" -signf -thumbprint ${THUMBPRINT} -cert -addchain -strict -der "${tmpFile}"`,
            { encoding: 'utf-8', stdio: 'pipe', shell: '/bin/bash' }
        );

        const sgnFile = path.join(tmpDir, 'doc.xml.sgn');
        const signature = fs.readFileSync(sgnFile);
        fs.rmSync(tmpDir, { recursive: true });

        return signature.toString('base64');
    } catch (err) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        throw err;
    }
}

function computeGostHash(filePath) {
    const hex = execSync(`"${CPVERIFY}" -mk -alg GR3411_2012_256 "${filePath}"`, {
        encoding: 'utf-8', stdio: 'pipe', shell: '/bin/bash'
    }).trim();
    return Buffer.from(hex, 'hex').toString('base64');
}
module.exports = { signFile, computeGostHash };
