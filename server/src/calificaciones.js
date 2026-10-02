/* Reglas de calificacion, en un solo sitio.
   Las usa la ruta del campus y el seed: si el calculo viviera dos veces, el
   ejemplo de la base y lo que ve la docente en pantalla dejarian de contar lo
   mismo. */

/* La definitiva NO es el promedio de los tres cortes: la universidad pesa cada
   uno (30%, 30% y 40%). Con el promedio plano el corte 3 pesaba lo mismo que el
   1 y la nota final no era la de la universidad. */
export const PESOS = { 1: 0.3, 2: 0.3, 3: 0.4 };

const redondear = (n) => Math.round(n * 100) / 100;

export const definitivaDe = (n1, n2, n3) => {
  const cortes = [n1, n2, n3];
  /* Con un corte sin nota no hay definitiva: es mejor dejarla vacia que poner
     un numero que despues se contradice solo. */
  if (cortes.some((n) => n === null || n === undefined)) return null;
  return redondear(
    cortes.reduce((suma, nota, i) => suma + nota * PESOS[i + 1], 0)
  );
};

export const estadoDe = (definitiva) => {
  if (definitiva === null || definitiva === undefined) return 'en_curso';
  return definitiva >= 3 ? 'aprobado' : 'reprobado';
};

/* Los cortes que el docente escribio a mano, en la forma "1,3". */
export const listaCortes = (texto) => String(texto || '')
  .split(',')
  .map((c) => Number(c.trim()))
  .filter((c) => c === 1 || c === 2 || c === 3);

export const cortesDe = (nota) => listaCortes(nota?.cortesManuales);

/* Un corte es el promedio de TODAS las actividades del corte, no solo de las que
   el alumno entregó: lo que no entregó cuenta cero, y por eso entregar una
   sola de tres actividades no puede dar un 5.

   Quedan fuera del promedio dos cosas que no son culpa del alumno: las
   actividades cuya fecha de entrega todavía no llega, y las que entregó pero el
   docente aún no ha calificado. Se cuentan aparte para poder avisar. */
export const resumenCorte = (corte, actividades, entregas, ahora = Date.now()) => {
  const delCorte = actividades.filter((a) => a.corte === corte);
  const porId = new Map(delCorte.map((a) => [a.id, a]));
  const vencidas = delCorte.filter((a) => !a.fechaEntrega || new Date(a.fechaEntrega).getTime() <= ahora);
  const porActividad = new Map(entregas.filter((e) => porId.has(e.actividadId)).map((e) => [e.actividadId, e]));

  let suma = 0;
  let calificadas = 0;
  let sinEntregar = 0;
  let sinCalificar = 0;
  for (const a of vencidas) {
    const entrega = porActividad.get(a.id);
    if (!entrega) { sinEntregar += 1; continue; }
    if (entrega.nota === null || entrega.nota === undefined || !a.puntos) { sinCalificar += 1; continue; }
    suma += (entrega.nota / a.puntos) * 5;
    calificadas += 1;
  }
  /* El denominador son las actividades vencidas menos las que el docente tiene
     pendientes de calificar: las que el alumno no entregó sí cuentan. */
  const total = calificadas + sinEntregar;
  return {
    valor: total ? redondear(suma / total) : null,
    total,
    calificadas,
    sinEntregar,
    sinCalificar,
    sinVencer: delCorte.length - vencidas.length,
    actividades: delCorte.length,
  };
};

/* Lo mismo, pero preguntando a la base: las actividades del corte y todas las
   entregas del alumno en ese curso. */
export const corteDesdeEntregas = async (prisma, estudianteId, cursoId, corte) => {
  const [actividades, entregas] = await Promise.all([
    prisma.actividad.findMany({
      where: { cursoId, corte },
      select: { id: true, corte: true, puntos: true, fechaEntrega: true },
    }),
    prisma.entrega.findMany({
      where: { estudianteId, actividad: { cursoId } },
      select: { actividadId: true, nota: true },
    }),
  ]);
  if (!actividades.length) return null;
  return resumenCorte(corte, actividades, entregas);
};
