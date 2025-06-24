import { Circle, NodeProps, Svg } from "@react-pdf/renderer";
import { PDF_STYLES } from "../pdf-styles";

const GripVerticalIcon: React.FC<NodeProps> = ({ ...props }) => {
  return (
    <Svg
      style={PDF_STYLES.smallIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <Circle cx="9" cy="12" r="1" />
      <Circle cx="9" cy="5" r="1" />
      <Circle cx="9" cy="19" r="1" />
      <Circle cx="15" cy="12" r="1" />
      <Circle cx="15" cy="5" r="1" />
      <Circle cx="15" cy="19" r="1" />
    </Svg>
  );
};

export default GripVerticalIcon;
