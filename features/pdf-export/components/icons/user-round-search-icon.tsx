import { Circle, NodeProps, Path, Svg } from "@react-pdf/renderer";
import { PDF_STYLES } from "../pdf-styles";

const UserRoundSearchIcon: React.FC<NodeProps> = ({ ...props }) => {
  return (
    <Svg
      style={PDF_STYLES.smallIcon}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      {...props}
    >
      <Circle cx="10" cy="8" r="5" />
      <Path d="M2 21a8 8 0 0 1 10.434-7.62" />
      <Circle cx="18" cy="18" r="3" />
      <Path d="m22 22-1.9-1.9" />
    </Svg>
  );
};

export default UserRoundSearchIcon;
