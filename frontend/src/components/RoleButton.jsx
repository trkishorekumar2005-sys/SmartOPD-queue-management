function RoleButton({ label, onClick }) {
  return (
    <button className="role-button" type="button" onClick={onClick}>
      {label}
    </button>
  )
}

export default RoleButton
