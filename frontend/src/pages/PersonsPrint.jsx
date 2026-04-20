import { useState, useEffect } from 'react';
import api, { getPersons } from '../services/api';

async function fetchPhotoBlob(personId) {
  try {
    const res = await api.get(`/persons/${personId}/photo`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  } catch {
    return null;
  }
}

function InfoRow({ icon, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 13, minWidth: 18, marginTop: 1 }}>{icon}</span>
      <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>{value}</span>
    </div>
  );
}

function PersonCard({ person, photoUrl, index }) {
  const positionLine = [
    person.positionName,
    person.positionStartDate
      ? new Date(person.positionStartDate).toLocaleDateString('tr-TR') +
        ' – ' +
        (person.positionEndDate
          ? new Date(person.positionEndDate).toLocaleDateString('tr-TR')
          : 'Devam ediyor')
      : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  const birthLine = person.birthDate
    ? new Date(person.birthDate).toLocaleDateString('tr-TR') +
      (person.age ? `  ·  ${person.age} yaşında` : '')
    : null;

  const tags = person.tags?.map(t => t.tag?.name).filter(Boolean) ?? [];
  const relCount = person.relationships?.filter(r => !r.isReverse).length ?? 0;
  const docCount = person.documents?.length ?? 0;

  return (
    <div
      className="person-page"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '14mm 16mm 12mm',
        boxSizing: 'border-box',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        pageBreakAfter: 'always',
        breakAfter: 'page',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: '#fff',
      }}
    >
      {/* ── HEADER BAND ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: 12,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        {/* Photo */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(255,255,255,0.3)',
            flexShrink: 0,
            background: photoUrl ? 'transparent' : 'linear-gradient(135deg, #475569, #64748b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.7)' }}>
              {person.firstName?.[0]?.toUpperCase()}
            </span>
          )}
        </div>

        {/* Name + position */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', marginBottom: 4 }}>
            {person.firstName} {person.lastName}
          </div>
          {positionLine && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
              {positionLine}
            </div>
          )}
          {person.organization && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              {person.organization}
            </div>
          )}
        </div>

        {/* Sıra no */}
        <div
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 600,
            alignSelf: 'flex-start',
            letterSpacing: 1,
          }}
        >
          #{String(index + 1).padStart(3, '0')}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', gap: 20, flex: 1 }}>
        {/* LEFT: iletişim bilgileri */}
        <div
          style={{
            flex: 1.1,
            background: '#f8fafc',
            borderRadius: 10,
            padding: '16px 18px',
            border: '1px solid #e2e8f0',
          }}
        >
          <SectionTitle>İletişim Bilgileri</SectionTitle>
          <InfoRow icon="📧" value={person.email} />
          <InfoRow icon="📞" value={person.phone} />
          <InfoRow icon="📅" value={birthLine} />
          <InfoRow icon="📍" value={person.address} />

          {(person.positionName || person.organization) && (
            <>
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '12px 0 10px' }} />
              <SectionTitle>Kurum Bilgisi</SectionTitle>
              <InfoRow icon="💼" value={person.positionName} />
              <InfoRow icon="🏢" value={person.organization} />
              {person.positionStartDate && (
                <InfoRow
                  icon="📆"
                  value={
                    'Görev: ' +
                    new Date(person.positionStartDate).toLocaleDateString('tr-TR') +
                    ' – ' +
                    (person.positionEndDate
                      ? new Date(person.positionEndDate).toLocaleDateString('tr-TR')
                      : 'Devam ediyor')
                  }
                />
              )}
            </>
          )}

          {person.notes && (
            <>
              <div style={{ borderTop: '1px solid #e2e8f0', margin: '12px 0 10px' }} />
              <SectionTitle>Notlar</SectionTitle>
              <p
                style={{
                  fontSize: 12,
                  color: '#4b5563',
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {person.notes}
              </p>
            </>
          )}
        </div>

        {/* RIGHT: ilişkiler + etiketler + evraklar */}
        <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* İlişkiler */}
          {person.relationships?.filter(r => !r.isReverse).length > 0 && (
            <div
              style={{
                background: '#f0f9ff',
                borderRadius: 10,
                padding: '14px 16px',
                border: '1px solid #bae6fd',
              }}
            >
              <SectionTitle color="#0369a1">İlişkiler</SectionTitle>
              {person.relationships
                .filter(r => !r.isReverse)
                .slice(0, 6)
                .map(r => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 0',
                      borderBottom: '1px solid #e0f2fe',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#0ea5e9',
                          color: '#fff',
                          borderRadius: 4,
                          padding: '2px 6px',
                          marginRight: 7,
                        }}
                      >
                        {r.relationshipType}
                      </span>
                      <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 500 }}>
                        {r.relatedPersonName}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: '#64748b' }}>
                      {new Date(r.startDate).toLocaleDateString('tr-TR')}
                      {r.endDate
                        ? ' – ' + new Date(r.endDate).toLocaleDateString('tr-TR')
                        : ''}
                    </span>
                  </div>
                ))}
              {person.relationships.filter(r => !r.isReverse).length > 6 && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                  +{person.relationships.filter(r => !r.isReverse).length - 6} daha...
                </div>
              )}
            </div>
          )}

          {/* Etiketler */}
          {tags.length > 0 && (
            <div
              style={{
                background: '#fdf4ff',
                borderRadius: 10,
                padding: '14px 16px',
                border: '1px solid #e9d5ff',
              }}
            >
              <SectionTitle color="#7e22ce">Etiketler</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: '#a855f7',
                      color: '#fff',
                      borderRadius: 20,
                      padding: '3px 10px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Özet sayaçlar */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: 10,
              padding: '14px 16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              gap: 12,
            }}
          >
            <CountBadge icon="🔗" count={relCount} label="İlişki" />
            <CountBadge icon="📄" count={docCount} label="Evrak" />
            <CountBadge
              icon="📋"
              count={new Date(person.createdAt).toLocaleDateString('tr-TR')}
              label="Kayıt"
              raw
            />
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 10,
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: 1 }}>
          PERSONTRACK
        </span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>
          Oluşturulma: {new Date(person.createdAt).toLocaleDateString('tr-TR')} &nbsp;·&nbsp;
          Dışa aktarım: {new Date().toLocaleDateString('tr-TR')}
        </span>
      </div>
    </div>
  );
}

function SectionTitle({ children, color = '#374151' }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function CountBadge({ icon, count, label, raw }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: raw ? 10 : 16, fontWeight: 700, color: '#1e293b' }}>{count}</div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function PersonsPrint() {
  const [persons, setPersons] = useState([]);
  const [photos, setPhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [printReady, setPrintReady] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getPersons();
        const list = res.data;
        setPersons(list);

        const photoMap = {};
        await Promise.all(
          list
            .filter(p => p.photoUrl)
            .map(async p => {
              const url = await fetchPhotoBlob(p.id);
              if (url) photoMap[p.id] = url;
            })
        );
        setPhotos(photoMap);
        setPrintReady(true);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      Object.values(photos).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'system-ui, sans-serif',
          color: '#475569',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Kişi kartları hazırlanıyor...</div>
        <div style={{ fontSize: 13, marginTop: 8, color: '#94a3b8' }}>Fotoğraflar yükleniyor</div>
      </div>
    );
  }

  if (!persons.length) {
    return (
      <div style={{ textAlign: 'center', padding: 60, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 40 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>Kişi bulunamadı</div>
      </div>
    );
  }

  return (
    <>
      {/* Print olmadığında görünen kontrol paneli */}
      <style>{`
        @media print {
          .print-controls { display: none !important; }
          body { margin: 0; background: #fff; }
          .person-page { box-shadow: none !important; }
        }
        @page { size: A4 portrait; margin: 0; }
        body { background: #e2e8f0; }
      `}</style>

      <div
        className="print-controls"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: '#1e293b',
          color: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'system-ui, sans-serif',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>PDF Dışa Aktarım</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {persons.length} kişi kartı hazır
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.close()}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            ✕ Kapat
          </button>
          <button
            onClick={() => window.print()}
            disabled={!printReady}
            style={{
              padding: '8px 22px',
              borderRadius: 8,
              border: 'none',
              background: printReady ? '#3b82f6' : '#64748b',
              color: '#fff',
              cursor: printReady ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            🖨️ Yazdır / PDF Kaydet
          </button>
        </div>
      </div>

      {/* Sayfalar */}
      <div
        style={{
          paddingTop: 60,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '76px 24px 40px',
        }}
      >
        {persons.map((person, i) => (
          <div
            key={person.id}
            style={{
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              borderRadius: 12,
              overflow: 'hidden',
              background: '#fff',
            }}
          >
            <PersonCard person={person} photoUrl={photos[person.id] || null} index={i} />
          </div>
        ))}
      </div>
    </>
  );
}
