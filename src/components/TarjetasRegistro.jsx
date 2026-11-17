/* =============================================
   Listado de registros en tarjetas, compartido por
   todos los perfiles. Sustituye a las tablas planas.

   Cada registro se dibuja como una tarjeta con:
   - avatar (foto de perfil o iniciales),
   - título y subtítulo,
   - datos clave en línea,
   - estado,
   - acciones.

   Uso:
   <TarjetasRegistro
     items={lista}
     getKey={(r) => r.id}
     avatar={(r) => ({ nombre: r.nombre, foto: r.avatar, clase: r.avatarClass })}
     titulo={(r) => r.nombre}
     subtitulo={(r) => r.usuario}
     datos={[{ etiqueta: 'Programa', render: (r) => r.programa }]}
     estado={(r) => <Badge tone="green">Activo</Badge>}
     acciones={(r) => <button>Editar</button>}
     vacio="Sin resultados."
   />
   ============================================= */
import React from 'react';
import Avatar from './Avatar';
import '../assets/css/registros.css';

export default function TarjetasRegistro({
  items = [],
  getKey,
  avatar,
  titulo,
  subtitulo,
  datos = [],
  estado,
  acciones,
  vacio = 'Sin resultados.',
  cargando = false,
}) {
  if (!cargando && items.length === 0) {
    return <div className="reg-vacio">{vacio}</div>;
  }
  return (
    <div className="reg-lista">
      {items.map((r, i) => {
        const av = avatar ? avatar(r) : null;
        return (
          <div key={getKey ? getKey(r) : i} className="reg-card">
            {av ? <Avatar nombre={av.nombre} foto={av.foto} clase={av.clase} tamano={44} radio={22} /> : null}
            <div className="reg-id">
              <div className="reg-nombre">{titulo ? titulo(r) : null}</div>
              {subtitulo ? <div className="reg-sub">{subtitulo(r)}</div> : null}
            </div>
            {datos.length > 0 && (
              <div className="reg-datos">
                {datos.map((d) => (
                  <div key={d.etiqueta} className="reg-dato">
                    <span className="reg-etq">{d.etiqueta}</span>
                    <span>{d.render(r) ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
            {estado && <div className="reg-estado">{estado(r)}</div>}
            {acciones && <div className="reg-acciones">{acciones(r)}</div>}
          </div>
        );
      })}
    </div>
  );
}
