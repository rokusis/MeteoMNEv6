import { describe, it, expect } from 'vitest';
import { parseOfficial } from '../src/sources/zhms-official-forecast/parseOfficial';
const SAMPLE = `
<div id="tab_a"><div class="prognoza-title">Petak, 04.09.2026.</div><div class="prognoza-text">Pretežno sunčano.</div><div class="prognoza-sign">prognoza ažurirana: 03.09.2026. 11:45 CEST</div><img src="/Meteorologija/Pr/cgprognoza-A.svg" /></div>
<div id="tab_b"><div class="prognoza-title">Subota, 05.09.2026.</div><div class="prognoza-text">Malo oblačno.</div><div class="prognoza-sign">prognoza ažurirana: 03.09.2026. 11:42 CEST</div><img src="/Meteorologija/Pr/cgprognoza-B.svg" /></div>
<div id="tab_c"><div class="prognoza-title">Prognoza za pomorce, 03.09.2026.</div><div class="prognoza-text">Vjetar NW 10 čvorova.</div><div class="prognoza-sign">prognoza ažurirana: 03.09.2026. 11:41 CEST</div><img src="/Meteorologija/Pr/jjadran.svg" /></div>
`;
describe('parseOfficial tabovi',()=>{
  it('cita tacne datume kako pisu, ne danas/sjutra',()=>{
    const p=parseOfficial(SAMPLE);
    expect(p.days.length).toBe(2);
    expect(p.days[0].title).toBe('Petak, 04.09.2026.');
    expect(p.days[0].text).toContain('sunčano');
    expect(p.days[0].issuedAt).toContain('11:45');
    expect(p.days[0].image).toContain('cgprognoza-A.svg');
    expect(p.days[1].title).toContain('Subota');
    expect(p.seafarer?.title.toLowerCase()).toContain('za pomorce');
    expect(p.seafarer?.text.toLowerCase()).toContain('nw');
  });
});
