import './App.css'
import CountUp from 'react-countup';
import esasLogo from './assets/esas-logo.png';
import { useEffect, useState } from 'react';

const POLL_MS = 5000;

const SERVICES = [
  {
    key: 'forwarding',
    url: 'http://localhost:3003/api/forwarding',
    readStats: (data) => data,
  },
  {
    key: 'moDocs',
    url: 'http://localhost:3001/api/results',
    readStats: (data) => data?.stats,
  },
  {
    key: 'deathCert',
    url: 'http://localhost:3002/api/death',
    readStats: (data) => data,
  },
];

const emptyStats = { totalDocs: 0, signedCount: 0, unsignedCount: 0 };

const initialState = SERVICES.reduce((acc, service) => {
  acc[service.key] = emptyStats;
  return acc;
}, {});

function normalizeStats(stats = {}) {
  const totalDocs = Number(stats.totalDocs ?? stats.количество ?? stats.sum?.количество ?? 0) || 0;
  const signedCount = Number(stats.signedCount ?? stats.успешные ?? stats.sum?.успешные ?? 0) || 0;
  const unsignedCount = Number(stats.unsignedCount ?? stats.пропущено ?? stats.sum?.пропущено ?? 0) || 0;

  return { totalDocs, signedCount, unsignedCount };
}

function App() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const fetchServices = async () => {
      const results = await Promise.all(SERVICES.map(async (service) => {
        try {
          const res = await fetch(service.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          return [service.key, normalizeStats(service.readStats(data))];
        } catch (_) {
          return [service.key, emptyStats];
        }
      }));

      setState(Object.fromEntries(results));
    };

    fetchServices();
    const id = setInterval(fetchServices, POLL_MS);
    return () => clearInterval(id);
  }, [])

  return (
    <div className='container'>
      <header>
        <a href=""><img src={esasLogo} alt="ESAS-21" className='logo' /></a>
      </header>
      <div className='success-rate'>
        <span className='results-note'>Период подписания документов: с 2024 года.</span>
      </div>
      <div className='wrap'>
        <div className='docs-total'>
          <div className='wrapper'>
            <span className='title'>Отправка в РЭМД</span>
          </div>
          <CountUp className='count' end={state.forwarding.signedCount} duration={1.5} separator=" " prefix="≈ " />
        </div>
        <div className='signed-count'>
          <div className='wrapper'>
            <span className='title'>Прочие документы</span>
          </div>
          <CountUp className='count' end={state.moDocs.signedCount} duration={1.5} separator=" " prefix="≈ " />
        </div>
        <div className='unsigned-count'>
          <div className='wrapper'>
            <span className='title'>Справка смерти</span>
          </div>
          <CountUp className='count' end={state.deathCert.signedCount} duration={1.5} separator=" " prefix="≈ " />
        </div>
      </div>
    </div>
  )
}

export default App
