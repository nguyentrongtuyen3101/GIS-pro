class GeoString {
  similarity(a, b) {
    if (a === b) return 1;
    if (!a.length || !b.length) return 0;

    const distance = this.levenshtein(a, b);
    const maxLength = Math.max(a.length, b.length);

    return 1 - distance / maxLength;
  }

  levenshtein(a, b) {
    const matrix = Array.from(
      { length: a.length + 1 },
      (_, i) => [i]
    );

    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[a.length][b.length];
  }

  distanceInMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;

    const toRad = (deg) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    const c =
      2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  }
}

export default new GeoString();