// Word suggestions for the kiosk keyboard, like a phone does. Fixed lists only:
// suggesting real members' names would show other people's data on screen.
const NOMBRES = `María Ana Laura Silvia Graciela Marta Mónica Patricia Claudia Susana Norma Liliana Beatriz Alicia
Gabriela Andrea Verónica Lorena Romina Carolina Mariana Natalia Paola Daniela Florencia Valeria Cecilia Sandra
Adriana Rosa Elena Teresa Mirta Nélida Stella Viviana Miriam Mirian Gladys Elsa Olga Irma Juana Carmen Lucía
Sofía Julieta Camila Agustina Micaela Antonella Milagros Rocío Belén Noelia Melina Tamara Yanina Vanesa Soledad
Fernanda Alejandra Lidia Hilda Ester Clara Martha Delia Inés Ramona Raquel Isabel Diana Nora Analía Karina
Marcela Fabiana Celeste Brenda Luciana Victoria Valentina Martina Catalina Emilia Tiara Anabel Betina
Juan José Carlos Luis Jorge Miguel Roberto Daniel Ricardo Mario Héctor Raúl Oscar Rubén Hugo Alberto Sergio
Néstor Omar Rodolfo Eduardo Francisco Antonio Pedro Manuel Javier Alejandro Diego Fernando Gustavo Marcelo
Pablo Martín Gabriel Claudio Walter Ariel Fabián Leonardo Gerardo Horacio Ramón Ángel Víctor Julio Enrique
Guillermo Ernesto Alfredo Norberto Darío Germán Hernán Sebastián Matías Nicolás Lucas Federico Santiago
Maximiliano Ezequiel Gonzalo Facundo Agustín Joaquín Tomás Franco Lautaro Bruno Emiliano Mauricio Cristian
Leandro Damián Esteban Rodrigo Marcos Andrés Ignacio Lisandro Augusto Arturo Edgardo Rogelio`
const APELLIDOS = `González Rodríguez Gómez Fernández López Díaz Martínez Pérez García Sánchez Romero Sosa Torres Álvarez
Ruiz Ramírez Flores Benítez Acosta Medina Herrera Suárez Aguirre Giménez Gutiérrez Pereyra Rojas Molina Castro
Ortiz Silva Núñez Luna Juárez Cabrera Ríos Morales Godoy Moreno Ferreyra Domínguez Carrizo Peralta Castillo
Ledesma Quiroga Vega Vera Muñoz Ojeda Ponce Villalba Cardozo Navarro Coronel Vázquez Ramos Figueroa Correa
Cáceres Vargas Maldonado Mendoza Miranda Arce Ortega Bustos Avila Ávila Paz Rivero Barrios Lescano Ibáñez
Schmidt Schneider Müller Muller Weimer Kloster Ruhl Kreiner Ott Kloss Bauer Weber
Meier Meyer Wagner Schmidt Kessler Becker Hoffmann Richter Klein Wolf Schröder Neumann Schwarz Zimmermann
Braun Krüger Hofmann Hartmann Lange Werner Krause Lehmann Köhler Herrmann Walter König Mayer Huber Kaiser
Fuchs Peters Lang Scholz Jung Hahn Vogel Friedrich Keller Günther Frank Berger Winkler Roth Beck Lorenz
Baumann Franke Albrecht Schuster Simon Ludwig Böhm Winter Kraus Martin Schumacher Krämer Vogt Stein Jäger
Otto Sommer Gross Seidel Heinrich Brandt Haas Schreiber Graf Schulte Dietrich Ziegler Kuhn Kühn Pohl Engel
Horn Busch Bergmann Thomas Voigt Sauer Arnold Wolff Pfeiffer Gareis Hollmann Sack Kehler
Schaab Wendler Reinoso Retamar Leiva Grünewald Kranewitter Wetzel Exner Sattler`

const quitarTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const unicos = (txt) => [...new Set(txt.split(/\s+/).filter(Boolean))]
// lists are roughly ordered by how common each one is: that order ranks the suggestions
const LISTA = [...unicos(NOMBRES).map((w, i) => ({ w, i, t: 'n' })), ...unicos(APELLIDOS).map((w, i) => ({ w, i, t: 'a' }))]
  .map(x => ({ ...x, k: quitarTildes(x.w) }))
const DOMINIOS = ['gmail.com', 'hotmail.com', 'yahoo.com.ar', 'outlook.com', 'hotmail.com.ar', 'live.com.ar', 'icloud.com', 'yahoo.com']

// Returns up to 3 { label, value }: value is the whole field once picked
export function sugerencias(mode, value, { nombre = '' } = {}) {
  if (mode === 'name') {
    const m = value.match(/^(.*?)([^ ]*)$/)
    const antes = m[1], palabra = m[2]
    if (palabra.length < 2) return []
    const k = quitarTildes(palabra)
    const usadas = new Set(antes.split(' ').filter(Boolean).map(quitarTildes))
    return LISTA.filter(x => x.k.startsWith(k) && x.k !== k && !usadas.has(x.k))
      // first word: first names first; after that: surnames first
      .sort((a, b) => ((a.t === (antes ? 'a' : 'n') ? 0 : 1) - (b.t === (antes ? 'a' : 'n') ? 0 : 1)) || a.i - b.i)
      .slice(0, 3)
      .map(x => ({ label: x.w, value: antes + x.w + ' ' }))
      // exact word typed but missing its accent: offer the accented one
      .concat(LISTA.filter(x => x.k === k && x.w.toLowerCase() !== palabra.toLowerCase()).slice(0, 1).map(x => ({ label: x.w, value: antes + x.w + ' ' })))
      .slice(0, 3)
  }
  if (mode === 'email') {
    const at = value.indexOf('@')
    if (at >= 0) {
      const dom = value.slice(at + 1).toLowerCase()
      return DOMINIOS.filter(d => d.startsWith(dom) && d !== dom).slice(0, 3)
        .map(d => ({ label: '@' + d, value: value.slice(0, at + 1) + d }))
    }
    // before the @: ideas built from the name typed in the form
    const partes = quitarTildes(nombre).replace(/[^a-z ]/g, '').split(' ').filter(Boolean)
    if (partes.length < 2) return []
    const [n, a] = [partes[0], partes[partes.length - 1]]
    const v = value.toLowerCase()
    return [...new Set([n + a, n + '.' + a, n[0] + a, a + n])]
      .filter(x => x.startsWith(v) && x !== v).slice(0, 3)
      .map(x => ({ label: x + '@…', value: x + '@' }))
  }
  return []
}
