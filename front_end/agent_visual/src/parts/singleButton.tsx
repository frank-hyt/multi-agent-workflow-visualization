import "./singleButton.css";

export default function SingleButton({ icon, text, onClick }:{icon:string, text:string, onClick: ()=>void}){
  return (
    <button className="rounded-button" onClick={onClick}>
      <span className="button-icon">{icon}</span>
      <span className="button-text">{text}</span>
    </button>
  );
}


