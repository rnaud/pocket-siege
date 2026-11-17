import { captureReplayActors, restoreReplayActors } from './replay-actor-adapter.js';

// In-memory renderer sidecar. Reuses resource identities and shader hooks;
// native task bytes and gameplay actor state remain separate snapshots.
export function captureReplayResources(resources, resourceKey) {
  const objects = [], elements = [], geometry = new Map(), materials = new Map();
  for (const [id, object] of resources) {
    if (object.isObject3D) {
      for (const child of object.children) resourceKey(child);
      // userData can link to objects outside the child tree. Discover them
      // while the Map iterator is live so their transforms and descendants
      // are captured too. Encode all roots together below to preserve aliases.
      captureReplayActors([{ id, actor: object.userData }], { resourceKey });
      if (object.geometry && !geometry.has(object.geometry)) geometry.set(object.geometry, object.geometry.clone());
      for (const material of [object.material].flat().filter(Boolean))
        if (!materials.has(material)) materials.set(material, material.clone());
      objects.push({ id, parent: object.parent, children: [...object.children],
        position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray(),
        visible: object.visible, renderOrder: object.renderOrder, geometry: object.geometry, material: object.material,
        userData: object.userData });
    } else if (typeof Element !== 'undefined' && object instanceof Element)
      elements.push({ id, parent: object.parentNode, template: object.cloneNode(true) });
  }
  const data = captureReplayActors(objects.map(row => ({ id: row.id, actor: row.userData })), { resourceKey });
  return { objects: objects.map(({ userData, ...row }) => row), elements, geometry, materials, data };
}

export function restoreReplayResources(snapshot, resources) {
  const data = restoreReplayActors(snapshot.data, { resolveResource: id => resources.get(id) });
  for (const [target, saved] of snapshot.geometry) target.copy(saved);
  for (const [target, saved] of snapshot.materials) target.copy(saved);
  for (const row of snapshot.objects) {
    const object = resources.get(row.id);
    object.position.fromArray(row.position); object.rotation.fromArray(row.rotation); object.scale.fromArray(row.scale);
    object.visible = row.visible; object.renderOrder = row.renderOrder;
    if (row.geometry) object.geometry = row.geometry;
    if (row.material) object.material = row.material;
    object.userData = data.get(row.id);
    for (const child of [...object.children]) object.remove(child);
    for (const child of row.children) object.add(child);
  }
  for (const row of snapshot.objects) {
    const object = resources.get(row.id);
    if (object.parent !== row.parent) { object.removeFromParent(); row.parent?.add(object); }
    object.updateMatrixWorld(true);
  }
  for (const row of snapshot.elements) {
    const element = resources.get(row.id);
    for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
    for (const attribute of row.template.attributes) element.setAttribute(attribute.name, attribute.value);
    element.innerHTML = row.template.innerHTML;
    if (element.parentNode !== row.parent) row.parent?.appendChild(element);
  }
}
