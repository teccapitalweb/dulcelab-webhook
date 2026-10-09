// Retos por nivel de dificultad. Debe coincidir con RETOS_LIBRARY y NIVELES_COFRE de dulcelab-club/vip-panel.html.
// El servidor da el cofre de cada nivel solo si la persona superó TODOS los retos de ese nivel.
export const NIVELES = {
  basico: { xp: 100, retos: ["q-mito-inocuidad","c-costo-flan","ad1","c-merma-zanahoria","sec2","q-masa","img2","c-escalar","ad2","q-ciencia-pastel","sec3","c-conversion-f","ad3","img4","ad4","q-cortes-mise","sec5","ad5","img6","q-mexicana","ad6","c-pasteles-evento","c-tazas"] },
  intermedio: { xp: 200, retos: ["sec1","img1","q-orden-refri","err1","img3","q-chocolate","c-precio","sec4","q-merengues","c-hidratacion","c-rendimiento","img5","q-salsas-madre","c-equilibrio","q-coccion","q-eventos","q-emprender","q-alergenos","q-fermento"] },
  avanzado: { xp: 300, retos: ["q-haccp","q-pasteleria-pro","q-panaderia-pro","q-cocina-pro","q-negocio-pro","c-pan-masa","c-precio-pastel","c-merma-lomo","c-galletas-evento","c-perdida-horneado"] }
};
