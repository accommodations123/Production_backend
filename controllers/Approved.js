import Approved from "../model/Approved.js";
import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";

export const getApprovedList = async (req, res) => {
  try {
    const list = await Approved.findAll({
      order: [['createdAt', 'DESC']]
    });

    const formatted = list.map(item => ({
      propertyId: item.property_id,
      title: item.property_snapshot?.title,
      city: item.property_snapshot?.city,
      country: item.property_snapshot?.country,
      pricePerNight: item.property_snapshot?.pricePerNight,
      photos: item.property_snapshot?.photos,

      ownerName: item.host_snapshot?.fullName,
      ownerEmail: item.host_snapshot?.email,
      ownerPhone: item.host_snapshot?.phone
    }));

    return res.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};



// GET only approved properties including host info
export const getApprovedWithHosts = async (req, res) => {
  try {

    const properties = await Property.findAll({
      where: { status: "approved" },
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          attributes: ["id", "email"]
        }
      ]
    });

    const data = await Promise.all(
      properties.map(async (property) => {
        const host = await Host.findOne({
          where: { user_id: property.user_id }
        });

        return {
          property,
          host
        }
      })
    )

    return res.json({
      success: true,
      data
    })

  } catch(err){
    console.log(err)
    res.status(500).json({ message:"server error" })
  }
}

