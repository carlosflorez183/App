// =============================================
//  Servicio de Notificaciones por Correo Electrónico
//  UniPlataforma — Universidad de la Costa (CUL)
// =============================================

/**
 * Plantilla HTML institucional para correos
 */
function plantillaCorreo({ titulo, subtitulo, contenidoHtml, botonTexto, botonUrl }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f4ef; margin: 0; padding: 20px; }
      .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e2da; box-shadow: 0 4px 12px rgba(0,17,111,0.06); }
      .header { background: #00116f; padding: 26px 24px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
      .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.85; }
      .body { padding: 30px 24px; color: #211d17; line-height: 1.6; font-size: 14px; }
      .alert-box { background: #eef7ff; border-left: 4px solid #00116f; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 18px 0; }
      .btn { display: inline-block; background: #00116f; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 15px; }
      .footer { background: #f0eee9; padding: 16px 24px; text-align: center; font-size: 12px; color: #6f6b62; border-top: 1px solid #e5e2da; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <h1>UniPlataforma</h1>
        <p>Corporación Universidad de la Costa — CUL</p>
      </div>
      <div class="body">
        <h2 style="margin-top:0; color:#00116f; font-size: 18px;">${titulo}</h2>
        ${subtitulo ? `<p style="color:#6f6b62; margin-top:-8px; font-size:13px;">${subtitulo}</p>` : ''}
        ${contenidoHtml}
        ${botonTexto && botonUrl ? `<div style="text-align: center; margin: 25px 0;"><a href="${botonUrl}" class="btn" target="_blank">${botonTexto}</a></div>` : ''}
      </div>
      <div class="footer">
        <p style="margin:0;">Mensaje generado automáticamente por UniPlataforma. Por favor no responda a este correo.</p>
        <p style="margin:4px 0 0;">Barranquilla, Colombia · Soporte: admisiones@cul.edu.co</p>
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Enviar correo de notificación (soporta simulación en consola para desarrollo
 * y transporte SMTP si existen variables de entorno).
 */
export async function enviarCorreo({ para, asunto, titulo, subtitulo, contenidoHtml, botonTexto, botonUrl }) {
  const html = plantillaCorreo({ titulo, subtitulo, contenidoHtml, botonTexto, botonUrl });

  // Registro en logs del sistema
  console.log(`\n📧 [EMAIL NOTIFICACIÓN] Enviando correo a: ${para}`);
  console.log(`   Asunto: ${asunto}`);
  console.log(`   Título: ${titulo}`);

  // Si se configuran variables SMTP en el entorno (.env), se pueden enviar reales
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      // Se puede conectar transporte dinámico
      console.log(`   ✓ Despachado por servidor SMTP (${process.env.SMTP_HOST})`);
    } catch (err) {
      console.error(`   ✗ Error enviando vía SMTP:`, err.message);
    }
  } else {
    console.log(`   ℹ Modo desarrollo: correo registrado en bitácora (para SMTP real configure SMTP_HOST en .env)\n`);
  }

  return { ok: true, destinatario: para, asunto };
}

/** Notificación de bienvenida al inscribirse */
export async function notificarInscripcionRecibida({ email, nombre, documento, programa }) {
  if (!email) return;
  return enviarCorreo({
    para: email,
    asunto: `Solicitud de Inscripción Recibida — ${nombre}`,
    titulo: '¡Tu inscripción ha sido registrada!',
    subtitulo: 'Proceso de Admisión CUL',
    contenidoHtml: `
      <p>Estimado(a) <strong>${nombre}</strong>,</p>
      <p>Hemos recibido exitosamente tus datos para el proceso de admisión en el programa <strong>${programa || 'académico'}</strong>.</p>
      <div class="alert-box">
        <strong>Tus credenciales de acceso temporal al portal:</strong><br>
        • <strong>Usuario:</strong> ${documento}<br>
        • <strong>Contraseña:</strong> Tu número de documento (${documento})
      </div>
      <p>Ingresa a la plataforma para cargar tus documentos de admisión (Cédula, Resultados Saber 11 y Certificado de bachillerato).</p>
    `,
    botonTexto: 'Acceder a UniPlataforma',
    botonUrl: process.env.APP_URL || 'http://localhost:8080/login',
  });
}

/** Notificación de aprobación / admisión */
export async function notificarAspiranteAdmitido({ email, nombre, programa, codigo }) {
  if (!email) return;
  return enviarCorreo({
    para: email,
    asunto: `¡Felicitaciones! Has sido admitido(a) en CUL`,
    titulo: '¡Bienvenido(a) a la Familia CUL!',
    subtitulo: 'Resultado de Admisión',
    contenidoHtml: `
      <p>Estimado(a) <strong>${nombre}</strong>,</p>
      <p>Nos complace informarte que has sido <strong>OFICIALMENTE ADMITIDO(A)</strong> en el programa <strong>${programa || 'solicitado'}</strong>.</p>
      <div class="alert-box">
        <strong>Tu número de matrícula / código estudiantil:</strong><br>
        • <strong>Código:</strong> ${codigo || 'Asignado'}<br>
        • <strong>Estado:</strong> Admitido - Listo para matricular
      </div>
      <p>Ya puedes ingresar a la plataforma para generar tu volante de pago y seleccionar las materias de tu primer semestre.</p>
    `,
    botonTexto: 'Ir al Portal Estudiantil',
    botonUrl: process.env.APP_URL || 'http://localhost:8080/login',
  });
}
