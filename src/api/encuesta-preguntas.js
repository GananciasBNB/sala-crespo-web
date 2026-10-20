// "Contanos de vos": profile questions members answer at the kiosk for points.
// The server sends this same list (prode-mundial/encuesta.js); this copy feeds the demo.
//   multi: several options allowed (then a LISTO button)
//   texto: options that open an OPTIONAL field to type, { opción: { modo, label, ph, siFalta } }
//          modo 'name' | 'email' | 'num' | 'fecha' (day + month); siFalta 'email'|'tel' = ask only if we don't have it yet
export const PUNTOS_POR_RESPUESTA = 20

export const PREGUNTAS = [
  {
    id: 'contacto', titulo: '¿Cómo preferís que te avisemos de promos?',
    opciones: ['WhatsApp', 'Mail', 'Telegram', 'SMS', 'No quiero que me contacten'],
    texto: {
      WhatsApp: { modo: 'num', label: 'Tu celular con característica (opcional)', ph: 'Ej. 343 4123456', siFalta: 'tel' },
      Telegram: { modo: 'num', label: 'Tu celular con característica (opcional)', ph: 'Ej. 343 4123456', siFalta: 'tel' },
      SMS: { modo: 'num', label: 'Tu celular con característica (opcional)', ph: 'Ej. 343 4123456', siFalta: 'tel' },
      Mail: { modo: 'email', label: 'Tu email (opcional)', ph: 'tu@email.com', siFalta: 'email' },
    },
  },
  { id: 'horario_mensajes', titulo: '¿En qué horario preferís recibir mensajes?', opciones: ['Mañana', 'Tarde', 'Noche'] },
  {
    id: 'zona', titulo: '¿De qué zona sos?',
    opciones: ['Crespo', 'Paraná', 'Ramírez', 'Libertador San Martín', 'Seguí', 'Viale', 'Diamante', 'Otra'],
    texto: { Otra: { modo: 'name', label: '¿De dónde sos? (opcional)', ph: 'Ej. Hasenkamp' } },
  },
  { id: 'genero', titulo: 'Sos…', opciones: ['Mujer', 'Hombre', 'Prefiero no decir'] },
  { id: 'hijos', titulo: '¿Tenés hijos?', opciones: ['No', 'Sí, menores de 18', 'Sí, mayores de 18', 'Sí, de las dos edades'] },
  {
    id: 'ocupacion', titulo: '¿A qué te dedicás?',
    opciones: ['Empleado/a', 'Independiente', 'Jubilado/a', 'Estudiante', 'Ama de casa', 'Otra'],
    texto: { Otra: { modo: 'name', label: '¿A qué te dedicás? (opcional)', ph: 'Ej. Docente' } },
  },
  { id: 'dias', titulo: '¿Qué días venís más seguido?', multi: true, opciones: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] },
  { id: 'horario_visita', titulo: '¿En qué horario venís?', multi: true, opciones: ['Tarde', 'Noche', 'Madrugada'] },
  { id: 'compania', titulo: '¿Con quién venís normalmente?', opciones: ['Solo/a', 'En pareja', 'Con amigos', 'En familia'] },
  { id: 'llegada', titulo: '¿Cómo llegás a la sala?', opciones: ['Auto', 'Moto', 'Remis', 'Colectivo', 'Caminando'] },
  { id: 'juego', titulo: '¿Qué juego te gusta más?', opciones: ['Rodillos clásicos', 'Video slots', 'Ruleta electrónica', 'Me gustan todos'] },
  { id: 'consumo_bar', titulo: '¿Consumís generalmente de nuestro bar?', opciones: ['Bebidas', 'Comidas', 'Ambos', 'No, casi nunca'] },
  { id: 'gustaria', titulo: '¿Qué te gustaría que haya más?', multi: true, opciones: ['Shows', 'Torneos', 'Sorteos', 'Cenas especiales', 'Música en vivo'] },
  {
    id: 'equipo', titulo: '¿Sos de algún equipo de fútbol?',
    opciones: ['Boca', 'River', 'Racing', 'Independiente', 'San Lorenzo', 'Patronato', 'Unión', 'Colón', "Newell's", 'Rosario Central', 'Otro', 'No miro fútbol'],
    texto: { Otro: { modo: 'name', label: '¿De qué equipo sos? (opcional)', ph: 'Ej. Belgrano' } },
  },
  { id: 'promo', titulo: '¿Qué promo te traería más seguido?', opciones: ['Tickets de juego', 'Puntos dobles', 'Cena o bebida', 'Sorteos grandes'] },
  {
    id: 'fecha_especial', titulo: '¿Tenés alguna fecha especial para festejar con nosotros?',
    opciones: ['Aniversario', 'Cumple de mi pareja', 'Otra', 'No'],
    texto: {
      Aniversario: { modo: 'fecha', label: '¿Qué día es? (opcional)', ph: 'DD/MM' },
      'Cumple de mi pareja': { modo: 'fecha', label: '¿Qué día es? (opcional)', ph: 'DD/MM' },
      Otra: { modo: 'fecha', label: '¿Qué día es? (opcional)', ph: 'DD/MM' },
    },
  },
]
