export function isParentOf(parent, child) {
    if (!parent.isMerge) return false;
    if (child.isMerge) {
        return child.children.every((c) => parent.children.includes(c));
    }
    return parent.children.includes(child.feature);
}

export function linkAllSubsets(rootMerge, data, linksArray, level = 0) {
    const children = rootMerge.children;
    const total = children.length;

    for (let k = total - 1; k >= 1; k--) {
        const candidates = data.filter((other) => {
            if (other.feature === rootMerge.feature) return false;

            if (k === 1 && !other.isMerge) {
                return children.includes(other.feature);
            }

            if (!other.isMerge) return false;
            if (other.children.length !== k) return false;

            return other.children.every((c) => children.includes(c));
        });

        candidates.forEach((sub) => {
            linksArray.push({
                parent: rootMerge,
                child: sub,
                level: level,
            });

            if (sub.isMerge) {
                linkAllSubsets(sub, data, linksArray, level + 1);
            }
        });
    }
}

export function removeDuplicateLinks(links) {
    const seen = new Set();
    return links.filter(({ parent, child }) => {
        const key = parent.feature + "->" + child.feature;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function filterLinks(links) {
    return links.filter((linkA) => {
        const A = linkA.parent;
        const E = linkA.child;

        const hasLowerLink = links.some((linkB) => {
            const P = linkB.parent;
            return P !== A && isParentOf(A, P) && linkB.child === E;
        });

        return !hasLowerLink;
    });
}

export function computeLinks(rootMerge, data) {
    let allLinks = [];
    linkAllSubsets(rootMerge, data, allLinks, 0);
    allLinks = removeDuplicateLinks(allLinks);
    return filterLinks(allLinks);
}
