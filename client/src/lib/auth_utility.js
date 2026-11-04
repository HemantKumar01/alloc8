function getRollNumber(idTokenClaims) {
  if (!idTokenClaims) return "";
  const emailId = idTokenClaims.email || idTokenClaims.preferred_username || "";
  const mailParts = emailId.split("@")[0].split("_");
  const rollNumber =
    mailParts[0].startsWith("2")
      ? mailParts[0]
      : mailParts[1];
  if (rollNumber == null) {
    return "";
  } else {
    return rollNumber;
  }
}

function getName(idTokenClaims) {
  return idTokenClaims?.name;
}

export { getRollNumber, getName };
/* vi: set et sw=2: */
